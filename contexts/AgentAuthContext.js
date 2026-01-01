/**
 * Agent Authentication Context
 * Provides authentication state and methods for agent panel
 * SINGLE SOURCE OF TRUTH for Socket.IO connection management
 * 
 * GLOBAL REAL-TIME NOTIFICATION SYSTEM:
 * - Always-connected socket when authenticated
 * - Listens for ticket:assigned events → shows toast + creates persistent notification
 * - Listens for receive_message events → shows toast + creates notification (if not viewing that ticket)
 * - Centralized notification management for the entire agent panel
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getAgentSocket, setSocketAuthToken } from '../lib/agentSocket';
import TicketAssignmentToasts from '../components/agent/TicketAssignmentToasts';
import NewMessageToasts from '../components/agent/NewMessageToasts';

const AgentAuthContext = createContext();

export function AgentAuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignmentToasts, setAssignmentToasts] = useState([]); // Ticket assignment toast notifications
  const [messageToasts, setMessageToasts] = useState([]); // New message toast notifications
  const [notificationRefreshTrigger, setNotificationRefreshTrigger] = useState(0); // Trigger for AgentGlobalData to refresh
  const router = useRouter();
  const socket = getAgentSocket(); // Get singleton socket instance

  useEffect(() => {
    // Skip if no socket (SSR)
    if (!socket) {
      console.warn('⚠️ AgentAuth: Socket not available (SSR)');
      setLoading(false);
      return;
    }

    // 1. Get Token
    const token = localStorage.getItem('agentAuthToken');
    const storedUser = localStorage.getItem('agentUser');
    
    console.log('🔍 AgentAuth: Checking Token...', token ? 'Found' : 'Missing');

    if (token && storedUser) {
      // Parse user
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAuthenticated(true);
        console.log('✅ AgentAuth: User authenticated:', userData.name, 'ID:', userData.id);
      } catch (e) {
        console.error('❌ AgentAuth: Invalid user data in localStorage');
        localStorage.removeItem('agentUser');
      }

      // 2. Update Socket Auth Token (This ensures socket has the latest token)
      console.log('🔑 AgentAuth: Updating socket auth with token (length:', token.length, ')');
      setSocketAuthToken(token);
      
      // 3. Force Connection if disconnected (ALWAYS CONNECTED while authenticated)
      if (!socket.connected) {
        console.log('🔌 AgentAuth: Triggering socket.connect() - Always-on connection');
        socket.connect();
      } else {
        console.log('✅ AgentAuth: Socket already connected');
      }

      // 4. Listen for Connect Errors (Crucial for debugging)
      socket.on('connect_error', (err) => {
        console.error('❌ AgentAuth: Connection Failed:', err.message);
      });

      socket.on('connect', () => {
        console.log('✅ AgentAuth: Connected! ID:', socket.id);
        console.log('✅ AgentAuth: Socket transport:', socket.io.engine.transport.name);
        
        // Send a ping to verify connection
        socket.emit('ping', { message: 'Agent connected', userId: user?.id });
      });

      // ===== GLOBAL EVENT LISTENER 1: TICKET ASSIGNMENTS =====
      socket.on('ticket:assigned', async (data) => {
        console.log('🎫 AgentAuth: Ticket assigned event received (via personal room):', data);
        
        // Get current user from localStorage
        const currentUser = JSON.parse(localStorage.getItem('agentUser') || '{}');
        const currentUserId = currentUser?.id;
        
        console.log('🔍 AgentAuth: Checking assignment - Current user ID:', currentUserId, 'Assignee ID:', data.assigneeId);
        
        // NOTE: Since we now emit to personal room (agent_<id>), this event should ONLY reach the correct agent
        // Keep validation check for defensive programming
        if (data.assigneeId === currentUserId || data.assignee?.id === currentUserId) {
          console.log('✅ AgentAuth: This ticket is assigned to current agent (via personal room)!');
          
          // Create toast notification (immediate feedback)
          const toast = {
            id: `assignment-${Date.now()}-${Math.random()}`,
            ticketId: data.ticketId || data.ticket?.ticketNumber || data.ticket?.id,
            ticketNumber: data.ticket?.ticketNumber || data.ticketId,
            subject: data.ticket?.subject || 'New Ticket',
            customerName: data.ticket?.customer?.name || data.customerName,
            priority: data.ticket?.priority || 'medium',
            assignedBy: data.assignedBy?.name || data.assignerName || 'Admin',
            timestamp: new Date().toISOString()
          };

          console.log('📢 AgentAuth: Adding assignment toast:', toast);
          setAssignmentToasts(prev => [...prev, toast]);

          // Create persistent notification in database
          try {
            const response = await fetch('/api/agent/notifications', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                type: 'ticket_assigned',
                title: `New Ticket Assigned: ${toast.ticketNumber}`,
                body: `${toast.subject} - Assigned by ${toast.assignedBy}`,
                link: `/agent/tickets/${toast.ticketId}`,
                metadata: {
                  ticketId: toast.ticketId,
                  ticketNumber: toast.ticketNumber,
                  priority: toast.priority,
                  customerName: toast.customerName
                }
              })
            });
            
            if (response.ok) {
              console.log('✅ AgentAuth: Persistent notification created for assignment');
              // Trigger notification bell refresh
              setNotificationRefreshTrigger(prev => prev + 1);
            }
          } catch (error) {
            console.error('❌ AgentAuth: Failed to create persistent notification:', error);
          }

          // Play notification sound (optional)
          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(err => console.warn('Could not play notification sound:', err));
          } catch (err) {
            // Silently ignore if notification.mp3 is missing
          }
        } else {
          console.log('⚠️ AgentAuth: Ticket assigned to different agent, ignoring');
        }
      });

      // ===== GLOBAL EVENT LISTENER 2: NEW MESSAGES (Personal Agent Channel) =====
      // Listen for agent:notification event sent to personal agent room
      // This works even when agent is NOT viewing the specific ticket
      socket.on('agent:notification', async (data) => {
        console.log('💬 AgentAuth: Agent notification received:', data);
        
        // Get current path to check if viewing this ticket
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const ticketIdFromUrl = currentPath.match(/\/agent\/tickets\/([^\/]+)/)?.[1];
        
        const messageTicketId = data.conversationId || data.ticketId;
        
        console.log('🔍 AgentAuth: Notification check - Current ticket in URL:', ticketIdFromUrl, 'Notification ticket:', messageTicketId);
        
        // Only show notification if agent is NOT currently viewing this ticket
        const isViewingThisTicket = ticketIdFromUrl === messageTicketId;
        
        // Only process new_message type notifications
        if (data.type === 'new_message' && !isViewingThisTicket) {
          console.log('✅ AgentAuth: Showing message notification (not viewing ticket)');
          
          // Create toast notification
          const messageToast = {
            id: `message-${Date.now()}-${Math.random()}`,
            ticketId: messageTicketId,
            ticketNumber: data.ticketNumber || messageTicketId,
            customerName: data.customerName || data.senderName || 'Customer',
            message: data.message || data.content || 'New message',
            timestamp: new Date().toISOString()
          };
          
          console.log('📢 AgentAuth: Adding message toast:', messageToast);
          setMessageToasts(prev => [...prev, messageToast]);
          
          // Create persistent notification in database
          try {
            const response = await fetch('/api/agent/notifications', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                type: 'new_message',
                title: `New message from ${messageToast.customerName}`,
                body: messageToast.message.length > 100 
                  ? messageToast.message.substring(0, 100) + '...' 
                  : messageToast.message,
                link: `/agent/tickets/${messageTicketId}`,
                metadata: {
                  ticketId: messageTicketId,
                  ticketNumber: messageToast.ticketNumber,
                  customerName: messageToast.customerName
                }
              })
            });
            
            if (response.ok) {
              console.log('✅ AgentAuth: Persistent notification created for message');
              // Trigger notification bell refresh
              setNotificationRefreshTrigger(prev => prev + 1);
            }
          } catch (error) {
            console.error('❌ AgentAuth: Failed to create persistent notification for message:', error);
          }
          
          // Play notification sound
          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(err => console.warn('Could not play notification sound:', err));
          } catch (err) {
            // Silently ignore if notification.mp3 is missing
          }
        } else {
          console.log('⚠️ AgentAuth: Notification suppressed (viewing ticket or not new_message type)');
        }
      });
    } else {
      console.warn('⚠️ AgentAuth: No token found. Login required.');
    }

    setLoading(false);

    // Cleanup: Remove listeners but DO NOT disconnect (keep singleton alive)
    return () => {
      if (socket) {
        socket.off('connect_error');
        socket.off('connect');
        socket.off('ticket:assigned');
        socket.off('agent:notification');
      }
    };
  }, []); // Run once on mount

  // Function to dismiss assignment toast notification
  const dismissToast = (toastId) => {
    setAssignmentToasts(prev => prev.filter(toast => toast.id !== toastId));
  };

  // Function to dismiss message toast notification
  const dismissMessageToast = (toastId) => {
    setMessageToasts(prev => prev.filter(toast => toast.id !== toastId));
  };

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/agent/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password
        }),
      });

      const data = await response.json();

      if (data.success && data.token && data.user) {
        // Store token and user in localStorage
        localStorage.setItem('agentAuthToken', data.token);
        localStorage.setItem('agentUser', JSON.stringify(data.user));
        
        setUser(data.user);
        setIsAuthenticated(true);
        
        // Connect socket with new token if not already connected
        if (socket && !socket.connected) {
          socket.auth = { token: data.token };
          console.log('🔌 AgentAuth: Triggering socket.connect() after login');
          socket.connect();
        }
        
        return { success: true, user: data.user };
      } else {
        return { 
          success: false, 
          message: data.message || 'Login failed. Please check your credentials.' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.message || 'An error occurred during login. Please try again.' 
      };
    }
  };

  const logout = async () => {
    // Disconnect Socket.IO on logout
    if (socket) {
      socket.disconnect();
      console.log('🔌 AgentAuth: Disconnected on logout');
    }
    
    // Clear server-side cookie
    try {
      await fetch('/api/agent/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error calling logout API:', error);
    }
    
    // Clear localStorage
    localStorage.removeItem('agentAuthToken');
    localStorage.removeItem('agentUser');
    
    // Clear state
    setIsAuthenticated(false);
    setUser(null);
    
    // Redirect to login
    router.push('/agent/login');
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('agentUser', JSON.stringify(userData));
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    socket,
    notificationRefreshTrigger // Expose to trigger AgentGlobalData refresh
  };

  return (
    <AgentAuthContext.Provider value={value}>
      {children}
      {/* Render stacked toast notifications for ticket assignments */}
      <TicketAssignmentToasts 
        toasts={assignmentToasts} 
        onDismiss={dismissToast} 
      />
      {/* Render stacked toast notifications for new messages */}
      <NewMessageToasts 
        toasts={messageToasts} 
        onDismiss={dismissMessageToast} 
      />
    </AgentAuthContext.Provider>
  );
}

export function useAgentAuth() {
  const context = useContext(AgentAuthContext);
  if (!context) {
    throw new Error('useAgentAuth must be used within AgentAuthProvider');
  }
  return context;
}

