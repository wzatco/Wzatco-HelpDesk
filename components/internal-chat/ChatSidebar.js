import { useState, useMemo } from 'react';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Search, MessageSquare, Plus } from 'lucide-react';
import NewChatSidebar from './NewChatSidebar';
import UserAvatar from './UserAvatar';

/**
 * Get the other participant in the chat
 * The API returns `otherParticipant` directly, but we also support legacy format
 */
const getOtherParticipant = (chat, currentUser) => {
  if (!currentUser) return null;
  
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

/**
 * ChatSidebar Component
 * Displays a searchable list of conversations with last message snippets
 */
export default function ChatSidebar({ chats = [], activeChatId, onSelectChat, currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);

  // Filter chats based on search query
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;

    const query = searchQuery.toLowerCase();
    return chats.filter(chat => {
      const otherParticipant = getOtherParticipant(chat, currentUser);
      const otherName = otherParticipant?.name || 'Unknown';
      const lastMessage = chat.lastMessage?.content || '';
      const lastMessageMetadata = chat.lastMessage?.metadata;
      
      // Also search in attachment names
      const attachmentText = lastMessageMetadata?.attachments
        ?.map(att => att.name || '')
        .join(' ') || '';
      
      return otherName.toLowerCase().includes(query) || 
             lastMessage.toLowerCase().includes(query) ||
             attachmentText.toLowerCase().includes(query);
    });
  }, [chats, searchQuery, currentUser]);

  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    
    // Show date if older than 24 hours
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Truncate message content
  const truncateMessage = (content, maxLength = 50) => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };


  // Handle user selection from NewChatSidebar
  const handleSelectUser = async (user) => {
    if (!user || !user.id || !user.type) {
      alert('Invalid user selection');
      return;
    }

    try {
      const response = await fetch('/api/internal/chats/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: user.id,
          targetUserType: user.type
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.chat?.id) {
          // Construct complete chat object from API response
          const chatObject = {
            id: data.chat.id,
            lastMessageAt: data.chat.lastMessageAt,
            createdAt: data.chat.createdAt,
            otherParticipant: data.chat.otherParticipant || {
              id: user.id,
              type: user.type,
              name: user.name || (user.type === 'admin' ? 'Admin' : 'Agent'),
              avatarUrl: user.avatar || user.avatarUrl || null
            },
            lastMessage: data.chat.lastMessage || null,
            unreadCount: 0
          };
          
          // Pass full chat object instead of just ID
          if (typeof onSelectChat === 'function') {
            onSelectChat(chatObject);
          } else {
            alert('Error: onSelectChat handler is not available');
          }
          
          // Close the new chat sidebar
          setShowNewChat(false);
        } else {
          alert('Chat created but no chat ID returned.');
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        alert(errorData.message || 'Failed to start chat');
      }
    } catch (error) {
      alert('An error occurred while starting the chat');
    }
  };

  // If showing new chat view, render NewChatSidebar instead
  if (showNewChat) {
    return (
      <NewChatSidebar
        onBack={() => setShowNewChat(false)}
        onSelectUser={handleSelectUser}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111b21] border-r border-gray-200 dark:border-gray-800">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-10 h-16 flex items-center px-4 bg-gray-100 dark:bg-[#202c33] border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between w-full mb-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Chats
          </h2>
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-[#2a3942] transition-colors"
            title="New Chat"
          >
            <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-[#202c33]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-white dark:bg-[#2a3942] border-0 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {searchQuery ? 'Try a different search term' : 'Start a new conversation to get started'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredChats.map((chat) => {
              const otherParticipant = getOtherParticipant(chat, currentUser);
              const isActive = chat.id === activeChatId;
              const unreadCount = chat.unreadCount || 0;
              const lastMessage = chat.lastMessage;

              return (
                <button
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={`w-full h-[72px] px-4 text-left transition-colors ${
                    isActive 
                      ? 'bg-gray-200 dark:bg-[#2a3942]' 
                      : 'hover:bg-gray-100 dark:hover:bg-[#202c33]'
                  }`}
                >
                  <div className="flex items-center gap-3 h-full">
                    {/* Avatar */}
                    <UserAvatar
                      name={otherParticipant?.name || 'Unknown'}
                      src={otherParticipant?.avatarUrl || otherParticipant?.avatar}
                      size="lg"
                      className="flex-shrink-0"
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-semibold text-sm truncate ${
                          isActive 
                            ? 'text-black dark:text-white' 
                            : 'text-black dark:text-white'
                        }`}>
                          {otherParticipant?.name || 'Unknown'}
                        </span>
                        {lastMessage && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                            {formatTime(lastMessage.createdAt)}
                          </span>
                        )}
                      </div>

                      {/* Last Message Preview */}
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${
                          unreadCount > 0
                            ? 'text-black dark:text-white font-semibold'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {lastMessage ? (
                            <>
                              {lastMessage.metadata?.attachments ? (
                                <span>
                                  📎 {lastMessage.metadata.attachments.length === 1 
                                    ? 'Attachment' 
                                    : `${lastMessage.metadata.attachments.length} attachments`}
                                  {lastMessage.content && ' • '}
                                  {lastMessage.content && truncateMessage(lastMessage.content)}
                                </span>
                              ) : (
                                truncateMessage(lastMessage.content || '')
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 italic">No messages yet</span>
                          )}
                        </p>

                        {/* Unread Badge */}
                        {unreadCount > 0 && (
                          <Badge 
                            variant="default" 
                            className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0 min-w-[20px] text-center"
                          >
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

