/**
 * Agent Notifications Context
 * Manages agent notifications (new chats, messages, tickets, etc.)
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAgentSocket } from '../hooks/useAgentSocket';
import { agentFetch } from '../lib/utils/agent-fetch';

const AgentNotificationsContext = createContext();

export function AgentNotificationsProvider({ children }) {
  const { socket, isConnected } = useAgentSocket();
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  /**
   * Fetch notifications from API
   */
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await agentFetch('/api/agent/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Add a new notification
   */
  const addNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  /**
   * Remove notification
   */
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
  }, []);

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Socket.IO event listeners for real-time notifications
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewChatAssigned = (data) => {
      addNotification({
        id: `chat-${data.chatId}-${Date.now()}`,
        type: 'chat_assigned',
        title: 'New Chat Assigned',
        message: `You have been assigned a new chat from ${data.customerName}`,
        chatId: data.chatId,
        read: false,
        createdAt: new Date().toISOString()
      });
    };

    const handleNewMessage = (data) => {
      // Only notify if it's not from the current agent
      if (data.senderType !== 'agent') {
        addNotification({
          id: `message-${data.id}`,
          type: 'new_message',
          title: 'New Message',
          message: `New message in chat from ${data.senderName}`,
          conversationId: data.conversationId,
          read: false,
          createdAt: data.createdAt || new Date().toISOString()
        });
      }
    };

    const handleTicketAssigned = (data) => {
      addNotification({
        id: `ticket-${data.ticketId}-${Date.now()}`,
        type: 'ticket_assigned',
        title: 'New Ticket Assigned',
        message: `You have been assigned ticket ${data.ticketNumber}`,
        ticketId: data.ticketId,
        ticketNumber: data.ticketNumber,
        read: false,
        createdAt: new Date().toISOString()
      });
    };

    const handleSlaBreach = (data) => {
      addNotification({
        id: `sla-${data.ticketId}-${Date.now()}`,
        type: 'sla_breach',
        title: 'SLA Breach Alert',
        message: `SLA breached for ticket ${data.ticketNumber}`,
        ticketId: data.ticketId,
        ticketNumber: data.ticketNumber,
        read: false,
        createdAt: new Date().toISOString()
      });
    };

    socket.on('chat:assigned', handleNewChatAssigned);
    socket.on('receive_message', handleNewMessage);
    socket.on('ticket:assigned', handleTicketAssigned);
    socket.on('sla:breach', handleSlaBreach);

    return () => {
      socket.off('chat:assigned', handleNewChatAssigned);
      socket.off('receive_message', handleNewMessage);
      socket.off('ticket:assigned', handleTicketAssigned);
      socket.off('sla:breach', handleSlaBreach);
    };
  }, [socket, isConnected, addNotification]);

  // Fetch notifications on mount
  useEffect(() => {
    if (isConnected) {
      fetchNotifications();
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, fetchNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  };

  return (
    <AgentNotificationsContext.Provider value={value}>
      {children}
    </AgentNotificationsContext.Provider>
  );
}

export function useAgentNotifications() {
  const context = useContext(AgentNotificationsContext);
  if (!context) {
    throw new Error('useAgentNotifications must be used within an AgentNotificationsProvider');
  }
  return context;
}

