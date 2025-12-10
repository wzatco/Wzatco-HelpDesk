// Live Chat Component - Real-time chat with agents via Socket.IO
'use client';

import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Send, Trash2 } from 'lucide-react';

export default function LiveChat({ userInfo, onBack, onChatEnd }) {
  const [socket, setSocket] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [status, setStatus] = useState('department'); // department, connecting, waiting, active
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentStatus, setAgentStatus] = useState('offline');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const departments = [
    {
      id: 'technical',
      name: 'Technical Support',
      icon: '🔧',
      agentName: 'Vinod',
      agentInitials: 'VI',
    },
    {
      id: 'sales',
      name: 'Sales Support',
      icon: '💼',
      agentName: 'Sumith',
      agentInitials: 'SU',
    },
    {
      id: 'general',
      name: 'General Support',
      icon: '📋',
      agentName: 'Karthik',
      agentInitials: 'KA',
    },
  ];

  // Initialize Socket.IO
  useEffect(() => {
    const socketUrl = typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:3000';

    const newSocket = io(socketUrl, {
      path: '/api/widget/socket',
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('✅ Widget: Socket.io connected!', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Widget: Socket.io disconnected');
    });

    newSocket.on('chat_joined', (data) => {
      console.log('✅ Widget: Chat joined:', data);
      setChatId(data.chatId);
      setStatus(data.status === 'active' ? 'active' : 'waiting');
      
      // Add initial message if provided
      if (data.message) {
        setMessages([{
          id: `init-${Date.now()}`,
          senderType: 'customer',
          senderName: userInfo.name,
          content: data.message,
          timestamp: new Date(),
        }]);
      }
    });

    newSocket.on('new_message', (data) => {
      console.log('📨 Widget: New message received:', data);
      if (data.senderType === 'agent') {
        setMessages(prev => {
          const exists = prev.find(m => m.id === data.id);
          if (exists) return prev;
          return [...prev, {
            id: data.id,
            senderType: 'agent',
            senderName: data.senderName || 'Agent',
            content: data.content,
            timestamp: new Date(data.timestamp),
          }];
        });
        setIsTyping(false);
      }
    });

    newSocket.on('agent_joined', (data) => {
      console.log('👤 Widget: Agent joined:', data);
      setAgentName(data.agentName);
      setAgentStatus('online');
      setStatus('active');
      
      // Add system message
      setMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        senderType: 'system',
        senderName: 'System',
        content: `${data.agentName} has joined the chat`,
        timestamp: new Date(),
      }]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleDepartmentSelect = (dept) => {
    setSelectedDepartment(dept);
    setStatus('connecting');
    
    // Join chat with department
    if (socket && socket.connected) {
      socket.emit('join_chat', {
        name: userInfo.name,
        email: userInfo.email,
        department: dept.name,
        message: `Customer selected ${dept.name.toLowerCase()}`,
        metadata: {
          department: dept.id,
        },
      });
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !socket || !chatId) return;

    const message = messageInput.trim();
    setMessageInput('');

    // Add message optimistically
    setMessages(prev => [...prev, {
      id: `temp-${Date.now()}`,
      senderType: 'customer',
      senderName: userInfo.name,
      content: message,
      timestamp: new Date(),
    }]);

    // Send via Socket.IO
    socket.emit('send_message', {
      chatId,
      message,
      senderName: userInfo.name,
    });
  };

  const handleDeleteChat = () => {
    if (confirm('Are you sure you want to delete this chat?')) {
      setMessages([]);
      setChatId(null);
      setStatus('department');
      setSelectedDepartment(null);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Department Selection Screen
  if (status === 'department') {
    return (
      <div className="h-full flex flex-col bg-black">
        <div className="flex-1 p-6 overflow-y-auto">
          <h3 className="text-white text-lg font-bold mb-4">Select Department</h3>
          <div className="space-y-3">
            {departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => handleDepartmentSelect(dept)}
                className="w-full p-4 rounded-xl bg-gray-800 border border-gray-700 hover:border-pink-500 transition-all text-left group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-2xl">
                    {dept.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold group-hover:text-pink-400 transition-colors">
                      {dept.name}
                    </h4>
                    <p className="text-gray-400 text-sm">
                      Agent: {dept.agentName}
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-500 group-hover:text-pink-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Chat Interface
  return (
    <div className="h-full flex flex-col bg-black">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {selectedDepartment ? selectedDepartment.agentInitials : 'M'}
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold">WZATCO AI</span>
              <div className={`w-1.5 h-1.5 rounded-full ${agentStatus === 'online' ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-xs text-white/90">{agentStatus === 'online' ? 'Online' : 'Connecting...'}</span>
            </div>
            {selectedDepartment && (
              <p className="text-xs text-white/80">{selectedDepartment.name}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleDeleteChat}
          className="p-1.5 hover:bg-white/25 rounded-lg transition-all"
          title="Delete Chat"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ scrollbarWidth: 'thin' }}
      >
        {messages.length === 0 && status === 'waiting' && (
          <div className="text-center text-gray-400 py-8">
            <p>Waiting for an agent to join...</p>
          </div>
        )}

        {messages.map((message) => {
          const isCustomer = message.senderType === 'customer';
          const isSystem = message.senderType === 'system';

          if (isSystem) {
            return (
              <div key={message.id} className="text-center text-gray-400 text-sm py-2">
                {message.content}
              </div>
            );
          }

          return (
            <div
              key={message.id}
              className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  isCustomer
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-white'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${isCustomer ? 'text-blue-100' : 'text-gray-300'}`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-700 rounded-2xl px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-700 bg-gray-900">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 placeholder-gray-400"
            disabled={status !== 'active'}
          />
          <button
            type="submit"
            disabled={!messageInput.trim() || status !== 'active'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

