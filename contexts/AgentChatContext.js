/**
 * Agent Chat State Context
 * Manages active chats, waiting queue, chat history, messages, and typing indicators
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAgentSocket } from '../hooks/useAgentSocket';
import { agentFetch } from '../lib/utils/agent-fetch';

const AgentChatContext = createContext();

export function AgentChatProvider({ children }) {
  const { socket, isConnected } = useAgentSocket();
  
  // Chat state
  const [activeChats, setActiveChats] = useState([]); // Chats assigned to this agent
  const [waitingQueue, setWaitingQueue] = useState([]); // Unassigned chats
  const [chatHistory, setChatHistory] = useState([]); // Closed chats
  const [selectedChat, setSelectedChat] = useState(null);
  const [loadingChats, setLoadingChats] = useState(false);
  
  // Messages state - Map of conversationId -> messages[]
  const [messages, setMessages] = useState(new Map());
  
  // Typing indicators - Map of conversationId -> Set of user IDs who are typing
  const [typingIndicators, setTypingIndicators] = useState(new Map());
  
  // Unread counts - Map of conversationId -> unread count
  const [unreadCounts, setUnreadCounts] = useState(new Map());

  /**
   * Fetch chats from API
   */
  const fetchChats = useCallback(async () => {
    setLoadingChats(true);
    try {
      // TODO: Replace with actual API endpoint when created
      // const response = await agentFetch('/api/agent/chats');
      // const data = await response.json();
      // setActiveChats(data.activeChats || []);
      // setWaitingQueue(data.waitingQueue || []);
      // setChatHistory(data.chatHistory || []);
      
      // Placeholder for now
      setActiveChats([]);
      setWaitingQueue([]);
      setChatHistory([]);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoadingChats(false);
    }
  }, []);

  /**
   * Fetch messages for a specific conversation
   */
  const fetchMessages = useCallback(async (conversationId) => {
    try {
      // TODO: Replace with actual API endpoint when created
      // const response = await agentFetch(`/api/agent/chats/${conversationId}/messages`);
      // const data = await response.json();
      // setMessages(prev => new Map(prev).set(conversationId, data.messages || []));
      
      // Placeholder for now
      if (!messages.has(conversationId)) {
        setMessages(prev => new Map(prev).set(conversationId, []));
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [messages]);

  /**
   * Add a message to a conversation
   */
  const addMessage = useCallback((conversationId, message) => {
    setMessages(prev => {
      const newMap = new Map(prev);
      const existingMessages = newMap.get(conversationId) || [];
      
      // Check if message already exists
      if (existingMessages.some(m => m.id === message.id)) {
        return prev;
      }
      
      newMap.set(conversationId, [...existingMessages, message]);
      return newMap;
    });
  }, []);

  /**
   * Update typing indicator
   */
  const setTyping = useCallback((conversationId, userId, isTyping) => {
    setTypingIndicators(prev => {
      const newMap = new Map(prev);
      if (isTyping) {
        const typingUsers = newMap.get(conversationId) || new Set();
        typingUsers.add(userId);
        newMap.set(conversationId, typingUsers);
      } else {
        const typingUsers = newMap.get(conversationId);
        if (typingUsers) {
          typingUsers.delete(userId);
          if (typingUsers.size === 0) {
            newMap.delete(conversationId);
          } else {
            newMap.set(conversationId, typingUsers);
          }
        }
      }
      return newMap;
    });
  }, []);

  /**
   * Mark messages as read
   */
  const markAsRead = useCallback((conversationId) => {
    setUnreadCounts(prev => {
      const newMap = new Map(prev);
      newMap.set(conversationId, 0);
      return newMap;
    });
  }, []);

  /**
   * Increment unread count
   */
  const incrementUnread = useCallback((conversationId) => {
    setUnreadCounts(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(conversationId) || 0;
      newMap.set(conversationId, current + 1);
      return newMap;
    });
  }, []);

  /**
   * Add chat to active chats
   */
  const addActiveChat = useCallback((chat) => {
    setActiveChats(prev => {
      // Check if chat already exists
      if (prev.some(c => c.id === chat.id)) {
        return prev.map(c => c.id === chat.id ? { ...c, ...chat } : c);
      }
      return [chat, ...prev];
    });
  }, []);

  /**
   * Remove chat from active chats
   */
  const removeActiveChat = useCallback((chatId) => {
    setActiveChats(prev => prev.filter(c => c.id !== chatId));
  }, []);

  /**
   * Update chat in active chats
   */
  const updateActiveChat = useCallback((chatId, updates) => {
    setActiveChats(prev => 
      prev.map(chat => chat.id === chatId ? { ...chat, ...updates } : chat)
    );
  }, []);

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for new messages
    const handleNewMessage = (messageData) => {
      if (messageData.conversationId) {
        addMessage(messageData.conversationId, {
          id: messageData.id,
          content: messageData.content,
          senderType: messageData.senderType,
          senderId: messageData.senderId,
          senderName: messageData.senderName,
          createdAt: messageData.createdAt,
          metadata: messageData.metadata
        });
        
        // Increment unread if not the selected chat
        if (selectedChat?.id !== messageData.conversationId) {
          incrementUnread(messageData.conversationId);
        }
      }
    };

    // Listen for typing indicators
    const handleTypingStart = (data) => {
      if (data.conversationId && data.userId) {
        setTyping(data.conversationId, data.userId, true);
      }
    };

    const handleTypingStop = (data) => {
      if (data.conversationId && data.userId) {
        setTyping(data.conversationId, data.userId, false);
      }
    };

    // Listen for new chats
    const handleNewChat = (chatData) => {
      if (chatData.status === 'waiting') {
        setWaitingQueue(prev => {
          if (prev.some(c => c.id === chatData.id)) return prev;
          return [chatData, ...prev];
        });
      } else if (chatData.assignedToId) {
        addActiveChat(chatData);
      }
    };

    // Listen for chat updates
    const handleChatUpdate = (chatData) => {
      if (chatData.status === 'closed') {
        removeActiveChat(chatData.id);
        setChatHistory(prev => {
          if (prev.some(c => c.id === chatData.id)) {
            return prev.map(c => c.id === chatData.id ? chatData : c);
          }
          return [chatData, ...prev];
        });
      } else {
        updateActiveChat(chatData.id, chatData);
      }
    };

    socket.on('receive_message', handleNewMessage);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('new_chat', handleNewChat);
    socket.on('chat:updated', handleChatUpdate);

    return () => {
      socket.off('receive_message', handleNewMessage);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('new_chat', handleNewChat);
      socket.off('chat:updated', handleChatUpdate);
    };
  }, [socket, isConnected, addMessage, setTyping, incrementUnread, addActiveChat, removeActiveChat, updateActiveChat, selectedChat]);

  // Fetch chats on mount
  useEffect(() => {
    if (isConnected) {
      fetchChats();
    }
  }, [isConnected, fetchChats]);

  const value = {
    // Chat state
    activeChats,
    waitingQueue,
    chatHistory,
    selectedChat,
    setSelectedChat,
    loadingChats,
    
    // Messages
    messages,
    getMessages: (conversationId) => messages.get(conversationId) || [],
    addMessage,
    fetchMessages,
    
    // Typing indicators
    typingIndicators,
    getTypingUsers: (conversationId) => Array.from(typingIndicators.get(conversationId) || []),
    setTyping,
    
    // Unread counts
    unreadCounts,
    getUnreadCount: (conversationId) => unreadCounts.get(conversationId) || 0,
    markAsRead,
    incrementUnread,
    
    // Chat actions
    addActiveChat,
    removeActiveChat,
    updateActiveChat,
    fetchChats
  };

  return (
    <AgentChatContext.Provider value={value}>
      {children}
    </AgentChatContext.Provider>
  );
}

export function useAgentChat() {
  const context = useContext(AgentChatContext);
  if (!context) {
    throw new Error('useAgentChat must be used within an AgentChatProvider');
  }
  return context;
}

