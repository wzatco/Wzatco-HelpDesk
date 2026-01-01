import { useState, useEffect, useCallback } from 'react';
import { useSocketListener } from '../../hooks/useSocketListener';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';

/**
 * InternalChatLayout Component
 * Main layout that combines ChatSidebar and ChatWindow
 * Fetches inbox and manages selected chat state
 */
export default function InternalChatLayout({ currentUser, initialChatId }) {
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(initialChatId || null);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);

  // Fetch inbox from API
  const fetchInbox = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/internal/chats');
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats || []);
        
        // Select chat based on priority:
        // 1. initialChatId (from query params)
        // 2. Currently selected chat (if still exists)
        // 3. First chat in list
        if (data.chats && data.chats.length > 0) {
          let chatToSelect = null;
          
          if (initialChatId) {
            chatToSelect = data.chats.find(c => c.id === initialChatId);
          }
          
          if (!chatToSelect && selectedChatId) {
            chatToSelect = data.chats.find(c => c.id === selectedChatId);
          }
          
          if (!chatToSelect) {
            chatToSelect = data.chats[0];
          }
          
          if (chatToSelect) {
            setSelectedChatId(chatToSelect.id);
            setSelectedChat(chatToSelect);
          }
        }
      }
    } catch (error) {
      // Error fetching inbox
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedChatId]);

  // Initial fetch
  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  // Update selected chat when initialChatId changes (e.g., from query params)
  useEffect(() => {
    if (initialChatId && initialChatId !== selectedChatId) {
      const chat = chats.find(c => c.id === initialChatId);
      if (chat) {
        setSelectedChatId(initialChatId);
        setSelectedChat(chat);
      }
    }
  }, [initialChatId, chats, selectedChatId]);

  // Listen for new messages to update last message in sidebar
  useSocketListener('internal:message:new', useCallback((messageData) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === messageData.chatId) {
        return {
          ...chat,
          lastMessage: messageData,
          lastMessageAt: messageData.createdAt,
          unreadCount: chat.id === selectedChatId 
            ? 0 
            : (chat.unreadCount || 0) + 1
        };
      }
      return chat;
    }));
  }, [selectedChatId]));

  // Handle chat selection - accepts either chatId (string) or full chat object
  const handleSelectChat = (chatIdOrChat) => {
    // If it's a full chat object, use it directly
    if (typeof chatIdOrChat === 'object' && chatIdOrChat.id) {
      const newChat = chatIdOrChat;
      
      // Check if chat already exists in list
      const existingChatIndex = chats.findIndex(c => c.id === newChat.id);
      
      if (existingChatIndex >= 0) {
        // Update existing chat
        setChats(prev => prev.map(c => 
          c.id === newChat.id ? { ...newChat, unreadCount: 0 } : c
        ));
      } else {
        // Add new chat to the beginning of the list
        setChats(prev => [{ ...newChat, unreadCount: 0 }, ...prev]);
      }
      
      // Select the chat immediately
      setSelectedChatId(newChat.id);
      setSelectedChat(newChat);
      
      // Mark as read
      setChats(prev => prev.map(c => 
        c.id === newChat.id ? { ...c, unreadCount: 0 } : c
      ));
      
      return;
    }
    
    // If it's just a chatId, find it in the existing list
    const chatId = chatIdOrChat;
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setSelectedChatId(chatId);
      setSelectedChat(chat);
      
      // Mark as read
      setChats(prev => prev.map(c => 
        c.id === chatId ? { ...c, unreadCount: 0 } : c
      ));
    } else {
      // Chat not in list, refresh inbox to get it
      fetchInbox(true);
    }
  };

  // Get other participant for the selected chat
  const getOtherParticipant = (chat) => {
    if (!chat || !currentUser) return null;

    // New API format: otherParticipant is already provided
    if (chat.otherParticipant) {
      return chat.otherParticipant;
    }

    // Legacy format: calculate from participant fields
    const isParticipantOne = 
      chat.participantOneId === currentUser.id && 
      chat.participantOneType === currentUser.type;

    if (isParticipantOne) {
      return {
        id: chat.participantTwoId,
        type: chat.participantTwoType,
        name: chat.participantTwoName || (chat.participantTwoType === 'admin' ? 'Admin' : 'Agent')
      };
    } else {
      return {
        id: chat.participantOneId,
        type: chat.participantOneType,
        name: chat.participantOneName || (chat.participantOneType === 'admin' ? 'Admin' : 'Agent')
      };
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-white dark:bg-[#0b141a]">
        <div className="text-gray-500 dark:text-gray-400">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full flex bg-white dark:bg-[#0b141a] overflow-hidden h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className={`w-full md:w-[350px] lg:w-[400px] flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111b21] flex flex-col ${
        selectedChatId ? 'hidden md:flex' : 'flex'
      }`}>
        <ChatSidebar
          chats={chats}
          activeChatId={selectedChatId}
          onSelectChat={handleSelectChat}
          currentUser={currentUser}
        />
      </div>

      {/* Chat Window */}
      <div className={`flex-1 flex flex-col min-w-0 bg-[#efeae2] dark:bg-[#0b141a] ${
        selectedChatId ? 'flex' : 'hidden md:flex'
      }`}>
        <ChatWindow
          chatId={selectedChatId}
          currentUser={currentUser}
          otherParticipant={selectedChat ? getOtherParticipant(selectedChat) : null}
        />
      </div>
    </div>
  );
}

