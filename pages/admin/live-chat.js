import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import AdminLayout from '../../components/admin/universal/AdminLayout';
import PageHead from '../../components/admin/PageHead';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  MessageCircle, 
  Send, 
  User, 
  Clock, 
  CheckCircle2, 
  Circle,
  AlertCircle,
  Search,
  X,
  MoreVertical
} from 'lucide-react';
import { withAuth } from '../../lib/withAuth';

// Socket.IO URL - now using Next.js server (same port as admin panel)
const SOCKET_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

export default function LiveChat() {
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [socket, setSocket] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      path: '/api/widget/socket',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('✅ Admin: Connected to chat server');
      // Rejoin all open chat rooms when reconnecting
      if (selectedChat) {
        newSocket.emit('join_chat_room', { chatId: selectedChat.id });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Admin: Disconnected from chat server');
    });

    newSocket.on('new_chat', (data) => {
      console.log('✅ Admin: New chat received via Socket.IO:', data);
      // Add the new chat to the list immediately (no API call needed)
      if (data.chatId) {
        // Create chat object from socket data
        const newChat = {
          id: data.chatId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          department: data.department,
          status: data.status || 'waiting',
          startedAt: data.startedAt || new Date(),
          lastMessageAt: data.startedAt || new Date(),
          messages: [],
        };
        
        setConversations(prev => {
          // Check if chat already exists
          const exists = prev.find(c => c.id === data.chatId);
          if (exists) {
            // Update existing chat
            return prev.map(c => c.id === data.chatId ? { ...c, ...newChat } : c);
          }
          // Add new chat at the beginning
          return [newChat, ...prev];
        });
      }
    });

    newSocket.on('chat_assigned', (data) => {
      console.log('👤 Admin: Chat assigned:', data);
      // Update conversations list without API call
      setConversations(prev => {
        return prev.map(conv => {
          if (conv.id === data.chatId) {
            return {
              ...conv,
              assignedAgentId: data.agentId,
              assignedAgentName: data.agentName,
              status: 'active',
            };
          }
          return conv;
        });
      });
      // Only fetch details if this is the selected chat
      if (selectedChat && selectedChat.id === data.chatId) {
        fetchChatDetails(data.chatId);
      }
    });

    newSocket.on('new_message', (data) => {
      console.log('📨 Admin: New message received via Socket.IO:', data);
      console.log('📨 Admin: Current selectedChat:', selectedChat?.id);
      console.log('📨 Admin: Message chatId:', data.chatId);
      
      // Update messages if this chat is currently selected
      if (selectedChat && selectedChat.id === data.chatId) {
        console.log('✅ Admin: Chat matches, adding message to UI');
        setMessages(prev => {
          // Avoid duplicates - check by ID first, then by content+timestamp
          const exists = prev.find(m => {
            if (m.id && data.id && m.id === data.id) return true;
            if (m.timestamp && data.timestamp && m.content === data.content) {
              const timeDiff = Math.abs(new Date(m.timestamp) - new Date(data.timestamp));
              if (timeDiff < 1000) return true; // Same message within 1 second
            }
            return false;
          });
          if (exists) {
            console.log('⚠️ Admin: Duplicate message ignored');
            return prev;
          }
          console.log('✅ Admin: Adding new message to chat');
          return [...prev, data];
        });
        scrollToBottom();
      } else {
        console.log('⚠️ Admin: Chat not selected or ID mismatch');
      }
      
      // Always update conversation list to show new message indicator
      setConversations(prev => {
        return prev.map(conv => {
          if (conv.id === data.chatId) {
            return {
              ...conv,
              lastMessageAt: data.timestamp || new Date(),
              messages: conv.messages ? [...conv.messages, data].slice(-1) : [data], // Keep only last message
            };
          }
          return conv;
        });
      });
    });

    newSocket.on('agent_joined', (data) => {
      console.log('Agent joined:', data);
      if (selectedChat && selectedChat.id === data.chatId) {
        fetchChatDetails(data.chatId);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Fetch conversations list
  const fetchConversations = async () => {
    try {
      console.log('📡 Admin: Fetching conversations from API...');
      const response = await fetch('/api/widget/chats?unique=true');
      const data = await response.json();
      console.log('📡 Admin: API response:', { success: data.success, count: data.data?.length || 0 });
      
      if (data.success) {
        const chats = data.data || [];
        console.log(`✅ Admin: Loaded ${chats.length} conversations`);
        setConversations(chats);
      } else {
        console.warn('⚠️ Admin: Failed to fetch conversations:', data);
        // Keep existing conversations, don't clear them
      }
    } catch (error) {
      console.error('❌ Admin: Error fetching conversations:', error);
      // Keep existing conversations on error
    } finally {
      setLoading(false);
    }
  };

  // Fetch chat details and messages
  const fetchChatDetails = async (chatId) => {
    try {
      const response = await fetch(`/api/widget/chats/${chatId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedChat(data.data);
        setMessages(data.data.messages || []);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error fetching chat details:', error);
    }
  };

  // Select a conversation
  const selectConversation = (chat) => {
    setSelectedChat(chat);
    fetchChatDetails(chat.id);
    
    // Join the chat room via Socket.IO for real-time updates
    if (socket && socket.connected) {
      console.log('🔗 Admin: Joining chat room:', chat.id);
      socket.emit('join_chat_room', { chatId: chat.id });
      // Also join the room directly using Socket.IO room feature
      socket.emit('join', `chat_${chat.id}`);
    }
  };

  // Assign chat to current agent
  const assignChat = async (chatId) => {
    if (!socket || !socket.connected) {
      console.error('Socket not connected');
      return;
    }
    
    const agentId = 'admin-agent'; // You can get this from auth context
    const agentName = 'Admin Agent'; // You can get this from auth context
    
    console.log('Assigning chat:', { chatId, agentId, agentName });
    
    socket.emit('assign_chat', {
      chatId,
      agentId,
      agentName
    }, (ack) => {
      if (ack && ack.success) {
        console.log('✅ Admin: Chat assigned successfully');
        // Update local state (Socket.IO event will also update it)
        setConversations(prev => {
          return prev.map(conv => {
            if (conv.id === chatId) {
              return {
                ...conv,
                assignedAgentId: 'admin-agent',
                assignedAgentName: 'Admin Agent',
                status: 'active',
              };
            }
            return conv;
          });
        });
        // Refresh selected chat details only
        if (selectedChat && selectedChat.id === chatId) {
          fetchChatDetails(chatId);
        }
      } else {
        console.error('❌ Admin: Failed to assign chat:', ack);
      }
    });
  };

  // Send message
  const sendMessage = async () => {
    if (!messageText.trim() || !selectedChat || !socket) return;

    setSending(true);
    try {
      socket.emit('agent_message', {
        chatId: selectedChat.id,
        agentId: 'admin-agent',
        agentName: 'Admin Agent',
        message: messageText.trim()
      });

      // Optimistically add message
      const tempMessage = {
        id: `temp-${Date.now()}`,
        senderId: 'admin-agent',
        senderType: 'agent',
        senderName: 'Admin Agent',
        content: messageText.trim(),
        timestamp: new Date(),
        read: false
      };
      setMessages(prev => [...prev, tempMessage]);
      setMessageText('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.customerName?.toLowerCase().includes(query) ||
      conv.customerEmail?.toLowerCase().includes(query) ||
      conv.department?.toLowerCase().includes(query) ||
      conv.messages?.[0]?.content?.toLowerCase().includes(query)
    );
  });

  // Load conversations on mount (only once, real-time updates via Socket.IO)
  useEffect(() => {
    console.log('🔄 Admin: Fetching conversations on mount');
    fetchConversations();
    // No polling - real-time updates via Socket.IO events only
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Format time
  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return d.toLocaleDateString();
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      waiting: { label: 'Waiting', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
      active: { label: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
      resolved: { label: 'Resolved', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
      closed: { label: 'Closed', color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300' }
    };
    return badges[status] || badges.waiting;
  };

  return (
    <AdminLayout>
      <PageHead title="Live Chat" />
      
      <div className="flex h-[calc(100vh-80px)] bg-slate-50 dark:bg-slate-900">
        {/* Sidebar - Conversation List */}
        <div className="w-80 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-violet-600" />
                Live Chats
              </h2>
              <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400">
                {conversations.length}
              </Badge>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                {searchQuery ? 'No conversations found' : 'No active conversations'}
              </div>
            ) : (
              filteredConversations.map((chat) => {
                const lastMessage = chat.messages?.[chat.messages.length - 1];
                const statusBadge = getStatusBadge(chat.status);
                const isSelected = selectedChat?.id === chat.id;
                
                return (
                  <div
                    key={chat.id}
                    onClick={() => selectConversation(chat)}
                    className={`p-4 border-b border-slate-200 dark:border-slate-700 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-violet-50 dark:bg-violet-900/20 border-l-4 border-l-violet-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                            {chat.customerName}
                          </h3>
                          {chat.status === 'waiting' && !chat.assignedAgentId && (
                            <Circle className="w-2 h-2 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                          {chat.customerEmail}
                        </p>
                      </div>
                      <Badge className={statusBadge.color + ' text-xs'}>
                        {statusBadge.label}
                      </Badge>
                    </div>
                    
                    {lastMessage && (
                      <div className="mt-2">
                        <p className="text-sm text-slate-600 dark:text-slate-300 truncate">
                          {lastMessage.content}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {formatTime(lastMessage.timestamp)}
                          </span>
                          {chat.status === 'waiting' && !chat.assignedAgentId && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                assignChat(chat.id);
                              }}
                              className="h-6 px-2 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                            >
                              Take Chat
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {chat.department}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                      <User className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {selectedChat.customerName}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {selectedChat.customerEmail} • {selectedChat.department}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusBadge(selectedChat.status).color}>
                      {getStatusBadge(selectedChat.status).label}
                    </Badge>
                    {selectedChat.status === 'waiting' && !selectedChat.assignedAgentId && (
                      <Button
                        onClick={() => assignChat(selectedChat.id)}
                        className="bg-violet-600 hover:bg-violet-700 text-white"
                      >
                        Take Chat
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
                {messages.map((message) => {
                  const isAgent = message.senderType === 'agent';
                  return (
                    <div
                      key={message.id || message.timestamp || `msg-${message.timestamp}`}
                      className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          isAgent
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {message.senderName}
                          </span>
                          <span
                            className={`text-xs ${
                              isAgent ? 'text-violet-100' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    disabled={sending || selectedChat.status === 'closed'}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!messageText.trim() || sending || selectedChat.status === 'closed'}
                    className="bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  Select a conversation
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  Choose a conversation from the list to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export const getServerSideProps = withAuth();
