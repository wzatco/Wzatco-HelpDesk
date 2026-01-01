/**
 * Agent Socket.IO Client - Singleton Pattern
 * Handles real-time communication for agent panel
 * Ensures exactly ONE physical connection to the server
 */

import { io } from 'socket.io-client';

let socket;

/**
 * Get or create the singleton Socket.IO instance
 * @returns {Socket} The singleton socket instance
 */
export const getAgentSocket = () => {
  // Only create socket in browser environment
  if (typeof window === 'undefined') {
    return null; // Return null during SSR
  }
  
  if (!socket) {
    // Get token from localStorage - try both admin and agent token keys
    const adminToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const agentToken = typeof window !== 'undefined' ? localStorage.getItem('agentAuthToken') : null;
    const token = adminToken || agentToken; // Admin token takes precedence
    
    socket = io({
      path: '/api/widget/socket', // Match server.js Socket.IO path
      autoConnect: false,         // We connect manually in AuthContext
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
      transports: ['websocket', 'polling'], // Force websocket first to avoid polling issues
      forceNew: false,
      rememberUpgrade: true,
      upgrade: true,
      auth: {
        token: token // Set initial token directly, not via callback
      }
    });
    
    console.log('🛠️ AgentSocket: Singleton Created (path: /api/widget/socket)');
    console.log('🔑 AgentSocket: Admin token present?', !!adminToken);
    console.log('🔑 AgentSocket: Agent token present?', !!agentToken);
    console.log('🔑 AgentSocket: Using token length:', token ? token.length : 0);
  }
  return socket;
};

/**
 * Update socket authentication token at runtime
 * @param {string} token - New JWT token
 */
export const setSocketAuthToken = (token) => {
  if (typeof window === 'undefined') return;
  
  const socket = getAgentSocket();
  if (!socket) return;
  
  console.log('🔑 AgentSocket: Updating auth token (length:', token ? token.length : 0, ')');
  
  // Update the auth object
  socket.auth = { token };
  
  // If already connected, reconnect with new credentials
  if (socket.connected) {
    console.log('🔄 AgentSocket: Reconnecting with new token...');
    socket.disconnect();
    socket.connect();
  }
  
  console.log('✅ AgentSocket: Auth token updated');
};

// Legacy class-based implementation kept for backward compatibility
// TODO: Remove this after all code is refactored to use getAgentSocket()
class AgentSocket {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = Infinity;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.eventQueue = [];
    this.listeners = new Map();
    this.connectionStatusListeners = new Set();
    this.token = null;
    this.baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  }

  /**
   * Initialize and connect to Socket.IO server
   * @param {string} token - JWT token for authentication
   */
  connect(token) {
    if (this.socket?.connected) {
      console.log('Agent Socket: Already connected');
      return;
    }

    if (!token) {
      console.warn('Agent Socket: No token provided');
      return;
    }

    this.token = token;

    // Disconnect existing socket if any
    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
    }

    console.log('Agent Socket: Connecting to', this.baseUrl, 'with path /api/widget/socket');

    try {
      this.socket = io(this.baseUrl, {
        path: '/api/widget/socket',
        transports: ['polling', 'websocket'], // Try polling first like admin panel
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
        auth: {
          token: token
        },
        forceNew: false,
        rememberUpgrade: true,
        upgrade: true
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('Agent Socket: Failed to create socket connection', error);
      this.updateConnectionStatus('error');
    }
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Agent Socket: Connected', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.updateConnectionStatus('connected');
      
      // Process queued events
      this.processEventQueue();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Agent Socket: Disconnected', reason);
      this.isConnected = false;
      this.updateConnectionStatus('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Agent Socket: Connection error', error.message || error);
      this.isConnected = false;
      this.reconnectAttempts++;
      this.updateConnectionStatus('error');
    });

    this.socket.on('error', (error) => {
      console.error('❌ Agent Socket: Socket error', error);
      this.updateConnectionStatus('error');
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('✅ Agent Socket: Reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.updateConnectionStatus('connected');
      this.processEventQueue();
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Agent Socket: Reconnection attempt', attemptNumber);
      this.updateConnectionStatus('reconnecting');
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Agent Socket: Reconnection failed');
      this.updateConnectionStatus('failed');
    });

    // Authentication
    this.socket.on('auth:success', (data) => {
      console.log('✅ Agent Socket: Authentication successful', data);
    });

    this.socket.on('auth:error', (error) => {
      console.error('❌ Agent Socket: Authentication error', error);
    });

    // Ticket events
    this.socket.on('receive_message', (messageData) => {
      console.log('📨 Agent Socket: Received message', messageData);
      this.emit('message:received', messageData);
    });

    this.socket.on('ticket:updated', (ticketData) => {
      console.log('📋 Agent Socket: Ticket updated', ticketData);
      this.emit('ticket:updated', ticketData);
    });

    this.socket.on('ticket:assigned', (assignmentData) => {
      console.log('👤 Agent Socket: Ticket assigned', assignmentData);
      this.emit('ticket:assigned', assignmentData);
    });

    this.socket.on('ticket:status:changed', (statusData) => {
      console.log('🔄 Agent Socket: Ticket status changed', statusData);
      this.emit('ticket:status:changed', statusData);
    });

    // Typing indicators
    this.socket.on('typing:start', (data) => {
      this.emit('typing:start', data);
    });

    this.socket.on('typing:stop', (data) => {
      this.emit('typing:stop', data);
    });

    // Presence events
    this.socket.on('agent:presence:update', (data) => {
      this.emit('agent:presence:update', data);
    });

    // Notification events
    this.socket.on('notification', (notificationData) => {
      console.log('🔔 Agent Socket: Notification received', notificationData);
      this.emit('notification', notificationData);
    });

    // Heartbeat/ping-pong
    this.socket.on('pong', () => {
      // Server responded to ping
      this.emit('heartbeat:received');
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.updateConnectionStatus('disconnected');
    }
  }

  /**
   * Join a conversation room
   * @param {string} conversationId - Ticket number
   */
  joinConversation(conversationId) {
    if (!this.socket || !this.isConnected) {
      console.warn('Agent Socket: Cannot join conversation - not connected');
      this.queueEvent('join:conversation', { conversationId });
      return;
    }

    this.socket.emit('join:conversation', { conversationId }, (ack) => {
      if (ack?.success) {
        console.log('✅ Agent Socket: Joined conversation', conversationId);
      } else {
        console.error('❌ Agent Socket: Failed to join conversation', ack);
      }
    });
  }

  /**
   * Leave a conversation room
   * @param {string} conversationId - Ticket number
   */
  leaveConversation(conversationId) {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit('ticket:leave', { conversationId }, (ack) => {
      if (ack?.success) {
        console.log('✅ Agent Socket: Left conversation', conversationId);
      }
    });
  }

  /**
   * Send a message
   * @param {string} conversationId - Ticket number
   * @param {string} content - Message content
   * @param {Object} metadata - Optional metadata
   */
  sendMessage(conversationId, content, metadata = {}) {
    if (!this.socket || !this.isConnected) {
      console.warn('Agent Socket: Cannot send message - not connected');
      this.queueEvent('message:send', { conversationId, content, metadata });
      return;
    }

    this.socket.emit('message:send', {
      conversationId,
      content,
      metadata
    }, (ack) => {
      if (ack?.success) {
        console.log('✅ Agent Socket: Message sent', ack.messageId);
        this.emit('message:sent', { messageId: ack.messageId, conversationId, content });
      } else {
        console.error('❌ Agent Socket: Failed to send message', ack);
        this.emit('message:error', { error: ack?.message || 'Failed to send message' });
      }
    });
  }

  /**
   * Start typing indicator
   * @param {string} conversationId - Ticket number
   */
  startTyping(conversationId) {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit('typing:start', { conversationId });
  }

  /**
   * Stop typing indicator
   * @param {string} conversationId - Ticket number
   */
  stopTyping(conversationId) {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit('typing:stop', { conversationId });
  }

  /**
   * Update agent presence
   * @param {string} status - Presence status (online, away, busy, offline)
   */
  updatePresence(status) {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit('presence:update', { status }, (ack) => {
      if (ack?.success) {
        console.log('✅ Agent Socket: Presence updated', status);
      }
    });
  }

  /**
   * View a ticket (track viewing)
   * @param {string} conversationId - Ticket number
   */
  viewTicket(conversationId) {
    if (!this.socket || !this.isConnected) {
      return;
    }

    this.socket.emit('ticket:view', { conversationId }, (ack) => {
      if (ack?.success) {
        console.log('✅ Agent Socket: Viewing ticket', conversationId);
      }
    });
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Emit custom event to listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Queue an event to be sent when connected
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  queueEvent(event, data) {
    this.eventQueue.push({ event, data, timestamp: Date.now() });
    console.log('Agent Socket: Queued event', event, this.eventQueue.length, 'events in queue');
  }

  /**
   * Process queued events
   */
  processEventQueue() {
    if (this.eventQueue.length === 0) return;

    console.log('Agent Socket: Processing', this.eventQueue.length, 'queued events');
    
    while (this.eventQueue.length > 0) {
      const { event, data } = this.eventQueue.shift();
      
      try {
        switch (event) {
          case 'join:conversation':
            this.joinConversation(data.conversationId);
            break;
          case 'message:send':
            this.sendMessage(data.conversationId, data.content, data.metadata);
            break;
          default:
            if (this.socket) {
              this.socket.emit(event, data);
            }
        }
      } catch (error) {
        console.error(`Error processing queued event ${event}:`, error);
      }
    }
  }

  /**
   * Subscribe to connection status changes
   * @param {Function} callback - Callback function(status)
   */
  onConnectionStatusChange(callback) {
    this.connectionStatusListeners.add(callback);
  }

  /**
   * Unsubscribe from connection status changes
   * @param {Function} callback - Callback function
   */
  offConnectionStatusChange(callback) {
    this.connectionStatusListeners.delete(callback);
  }

  /**
   * Update connection status and notify listeners
   * @param {string} status - Connection status
   */
  updateConnectionStatus(status) {
    this.connectionStatusListeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in connection status listener:', error);
      }
    });
  }

  /**
   * Get current connection status
   * @returns {string} Connection status
   */
  getConnectionStatus() {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    if (this.socket.connecting) return 'connecting';
    return 'disconnected';
  }

  /**
   * Start heartbeat/ping-pong
   */
  startHeartbeat(interval = 30000) {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('ping');
      }
    }, interval);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// Create singleton instance for legacy class (backward compatibility)
let agentSocketInstance = null;

/**
 * Get or create legacy agent socket instance (for backward compatibility)
 * @deprecated Use the new getAgentSocket() function at the top of this file instead
 * @returns {AgentSocket} Agent socket instance
 */
export function getAgentSocketLegacy() {
  if (!agentSocketInstance) {
    agentSocketInstance = new AgentSocket();
  }
  return agentSocketInstance;
}
