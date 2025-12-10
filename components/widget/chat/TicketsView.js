// Tickets View for Widget
'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Ticket, ArrowLeft, Clock, CheckCircle, XCircle, X, Send, User, UserCheck, Building2, Calendar, MessageSquare, AlertCircle, Tag, Paperclip, Image as ImageIcon, File, X as XIcon, Reply } from 'lucide-react';
import { io } from 'socket.io-client';
import EmojiPicker from './EmojiPicker';

export default function TicketsView({ userInfo, onBack }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetails, setTicketDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // { file, previewUrl, type, name }
  const [isUploading, setIsUploading] = useState(false);
  const [fileSizeError, setFileSizeError] = useState(null); // { fileSizeMB: string }
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchTickets();

    // Initialize Socket.IO connection
    const socket = io({
      path: '/api/widget/socket',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('✅ Widget: Socket.IO connected', socket.id);
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Widget: Socket.IO disconnected');
      setSocketConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Widget: Socket.IO connection error:', error);
      setSocketConnected(false);
    });

    socketRef.current = socket;

    return () => {
      // Don't disconnect on unmount, keep connection alive
    };
  }, []);

  useEffect(() => {
    if (selectedTicket && socketRef.current) {
      const socket = socketRef.current;
      
      // Join room for this ticket
      if (socket.connected) {
        console.log(`🔌 Widget: Joining room ticket_${selectedTicket.id}`);
        socket.emit('join_room', { conversationId: selectedTicket.id });
        fetchTicketDetails(selectedTicket.id);
      } else {
        // Wait for connection
        const connectHandler = () => {
          console.log(`🔌 Widget: Connected, joining room ticket_${selectedTicket.id}`);
          socket.emit('join_room', { conversationId: selectedTicket.id });
          fetchTicketDetails(selectedTicket.id);
          socket.off('connect', connectHandler);
        };
        socket.on('connect', connectHandler);
      }

      // Listen for new messages
      const handleReceiveMessage = (messageData) => {
        console.log('📨 Widget: Received message:', messageData);
        // CRITICAL: Socket ID Exclusion - ignore if this is our own message
        if (messageData.socketId === socket.id) {
          console.log('⚠️ Widget: Ignoring own message (socketId match):', messageData.id);
          return;
        }
        
        // Only process messages for this conversation
        if (messageData.conversationId === selectedTicket.id) {
          setTicketDetails(prev => {
            if (!prev) return prev;
            
            // Check if message already exists (safety net)
            if (prev.messages?.some(m => m.id === messageData.id)) {
              console.log('⚠️ Widget: Message already exists, skipping:', messageData.id);
              return prev;
            }
            
            console.log('✅ Widget: Adding new message:', messageData.id);
            return {
              ...prev,
              messages: [...(prev.messages || []), {
                id: messageData.id,
                content: messageData.content,
                senderType: messageData.senderType,
                senderId: messageData.senderId,
                senderName: messageData.senderType === 'customer' ? 'You' : (messageData.senderName || 'Support Agent'),
                createdAt: messageData.createdAt,
                metadata: messageData.metadata || undefined,
                replyTo: messageData.replyTo || null
              }]
            };
          });

          // Scroll to bottom
          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }
      };

      socket.on('receive_message', handleReceiveMessage);

      return () => {
        // Leave room when ticket is deselected
        if (socket.connected) {
          socket.emit('leave_ticket_room', { ticketId: selectedTicket.id });
        }
        socket.off('receive_message', handleReceiveMessage);
      };
    }
  }, [selectedTicket]);

  useEffect(() => {
    if (ticketDetails?.messages && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ticketDetails?.messages]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/widget/tickets?email=${encodeURIComponent(userInfo?.email)}`);
      const data = await response.json();
      if (data.success) {
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (ticketId) => {
    setLoadingDetails(true);
    try {
      const response = await fetch(`/api/widget/tickets/${ticketId}?email=${userInfo?.email}`);
      const data = await response.json();
      if (data.success) {
        setTicketDetails(data.ticket);
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };


  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleReply = (message) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleFileUpload = (file) => {
    if (!file) return;

    // File size validation (50MB limit)
    const maxFileSize = 50 * 1024 * 1024; // 50MB in bytes
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    
    if (file.size > maxFileSize) {
      setFileSizeError({ fileSizeMB });
      return;
    }

    // Determine file type
    const mimeType = file.type || 'application/octet-stream';
    let type = 'file';
    if (mimeType.startsWith('image/')) {
      type = 'image';
    } else if (mimeType.startsWith('video/')) {
      type = 'video';
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);

    // Set selected file state (draft mode)
    setSelectedFile({
      file,
      previewUrl,
      type,
      name: file.name
    });
  };

  const handleSendMessage = async () => {
    // Don't send if both message and file are empty
    if ((!newMessage.trim() && !selectedFile) || !selectedTicket || sendingMessage) return;

    const messageContent = newMessage.trim();
    const socket = socketRef.current;

    if (!socket || !socket.connected) {
      alert('Connection lost. Please refresh the page and try again.');
      return;
    }

    // Get customer identity
    const customerEmail = userInfo?.email;
    const customerName = userInfo?.name || 'Customer';
    
    // Find customer ID from ticket details or use email as fallback
    const customerId = ticketDetails?.customerId || customerEmail;

    // Upload file if selected
    let attachmentMetadata = null;
    if (selectedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile.file);

        const response = await fetch('/api/chat/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (response.ok && data.success) {
          attachmentMetadata = {
            type: data.attachment.type,
            url: data.attachment.url,
            fileName: data.attachment.fileName,
          };
        } else {
          // Handle file size error specifically
          if (response.status === 413 || (data.error && data.error.includes('exceeded'))) {
            const fileSizeMB = (selectedFile.file.size / (1024 * 1024)).toFixed(2);
            setFileSizeError({ fileSizeMB });
          } else {
            alert(data.error || 'Failed to upload file');
          }
          setIsUploading(false);
          return;
        }
      } catch (error) {
        console.error('File upload error:', error);
        // Check if it's a file size error
        if (error.message && error.message.includes('exceeded')) {
          const fileSizeMB = (selectedFile.file.size / (1024 * 1024)).toFixed(2);
          setFileSizeError({ fileSizeMB });
        } else {
          alert('Failed to upload file');
        }
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
        // Clean up preview URL
        if (selectedFile.previewUrl) {
          URL.revokeObjectURL(selectedFile.previewUrl);
        }
        setSelectedFile(null);
      }
    }

    // Create optimistic message
    const optimisticMessage = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: messageContent,
      senderType: 'customer',
      senderId: customerId,
      senderName: 'You',
      createdAt: new Date().toISOString(),
      metadata: attachmentMetadata,
      replyTo: replyingTo ? {
        id: replyingTo.id,
        content: replyingTo.content,
        senderType: replyingTo.senderType,
        senderName: replyingTo.senderName || (replyingTo.senderType === 'customer' ? 'You' : 'Support Agent')
      } : null,
      status: 'sending'
    };

    // Optimistically add to UI
    console.log('💬 Widget: Adding optimistic message');
    setTicketDetails(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: [...(prev.messages || []), optimisticMessage]
      };
    });
    setNewMessage('');
    setReplyingTo(null);

    // Scroll to bottom
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);

    try {
      setSendingMessage(true);

      // Create payload with socketId for exclusion
      // Allow empty content if there's an attachment
      const payload = {
        conversationId: selectedTicket.id,
        content: messageContent || '', // Empty string is allowed if metadata exists
        senderId: customerId,
        senderType: 'customer',
        senderName: customerName,
        socketId: socket.id, // CRITICAL: Include socket ID for exclusion
        metadata: attachmentMetadata || undefined,
        replyToId: replyingTo?.id || null,
      };

      console.log('📤 Widget: Sending message via Socket.IO:', payload);
      socket.emit('send_message', payload);

      // Wait for confirmation (optional - for error handling)
      const confirmationTimeout = setTimeout(() => {
        console.warn('⚠️ Widget: No confirmation received, message may have failed');
      }, 5000);

      socket.once('message_sent', (data) => {
        clearTimeout(confirmationTimeout);
        if (data.success) {
          console.log('✅ Widget: Message confirmed:', data.id);
          // Replace optimistic message with real one
          setTicketDetails(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: prev.messages?.map(m => 
                m.id === optimisticMessage.id 
                  ? { ...m, id: data.id, status: 'sent' }
                  : m
              ) || []
            };
          });
        }
      });

    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setTicketDetails(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages?.filter(m => m.id !== optimisticMessage.id) || []
        };
      });
      setNewMessage(messageContent); // Restore message
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatMessageTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    
    // Format time in IST (Asia/Kolkata timezone)
    return date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />;
      case 'closed':
        return <XCircle className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      case 'resolved':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800';
      case 'closed':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800';
      case 'low':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    
    // Get current date in IST
    const now = new Date();
    const nowIST = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    }).formatToParts(now);
    
    // Get message date in IST
    const messageIST = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    }).formatToParts(date);
    
    // Compare dates
    const today = {
      year: parseInt(nowIST.find(p => p.type === 'year').value),
      month: parseInt(nowIST.find(p => p.type === 'month').value),
      day: parseInt(nowIST.find(p => p.type === 'day').value)
    };
    
    const messageDate = {
      year: parseInt(messageIST.find(p => p.type === 'year').value),
      month: parseInt(messageIST.find(p => p.type === 'month').value),
      day: parseInt(messageIST.find(p => p.type === 'day').value)
    };
    
    // Check if it's today
    if (messageDate.year === today.year && 
        messageDate.month === today.month && 
        messageDate.day === today.day) {
      return 'Today';
    }
    
    // Check if it's yesterday
    const yesterday = new Date(today.year, today.month - 1, today.day);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.year === yesterday.getFullYear() && 
        messageDate.month === yesterday.getMonth() + 1 && 
        messageDate.day === yesterday.getDate()) {
      return 'Yesterday';
    }
    
    // Otherwise show the date
    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <div className="h-full flex flex-col bg-white dark:bg-slate-900 animate-slide-in w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-red-600 text-white px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={onBack}
              className="p-1 hover:bg-white/20 rounded transition-all"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <Ticket className="w-4 h-4 sm:w-5 sm:h-5" />
              <h2 className="text-sm sm:text-base font-semibold">My Tickets</h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400 dark:text-gray-500 text-sm">Loading tickets...</div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <Ticket className="w-12 h-12 mb-3 opacity-50 dark:opacity-40" />
              <p className="text-sm dark:text-gray-400">No tickets yet</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="p-3 sm:p-4 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex-1 min-w-0" onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTicket(ticket);
                    }}>
                      <h3 
                        className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-1 truncate cursor-pointer hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTicket(ticket);
                        }}
                      >
                        {ticket.subject || `Ticket #${ticket.id}`}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {ticket.description || 'No description'}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 flex-shrink-0 ${getStatusColor(ticket.status)}`}>
                      {getStatusIcon(ticket.status)}
                      <span className="capitalize hidden sm:inline">{ticket.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="truncate">#{ticket.id.slice(-8)}</span>
                    <span className="ml-2 flex-shrink-0">{formatDate(ticket.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ticket Detail Popup - Full Screen on Mobile, Modal on Desktop */}
      {isMounted && selectedTicket && typeof window !== 'undefined' && document.body && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            // Only close on backdrop click (not on mobile back button area)
            if (e.target === e.currentTarget) {
              setSelectedTicket(null);
              setTicketDetails(null);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-slate-900 shadow-2xl w-full h-full flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - WhatsApp Style */}
            <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-red-600 text-white px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                {/* Back button for mobile */}
                <button
                  onClick={() => {
                    setSelectedTicket(null);
                    setTicketDetails(null);
                  }}
                  className="sm:hidden p-1.5 hover:bg-white/20 rounded-lg transition-colors mr-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Ticket className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-xl font-bold truncate">{selectedTicket.subject || `Ticket #${selectedTicket.id.slice(-8)}`}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <div className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center gap-1 ${getStatusColor(selectedTicket.status)}`}>
                      {getStatusIcon(selectedTicket.status)}
                      <span className="capitalize">{selectedTicket.status}</span>
                    </div>
                    {selectedTicket.priority && (
                      <div className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center gap-1 ${getPriorityColor(selectedTicket.priority)}`}>
                        <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="capitalize">{selectedTicket.priority}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Close button for desktop */}
              <button
                onClick={() => {
                  setSelectedTicket(null);
                  setTicketDetails(null);
                }}
                className="hidden sm:flex p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Content - Sidebar + Details + Conversation */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Sidebar - Ticket List (Hidden on Mobile) */}
              <div className="hidden sm:flex w-72 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-col flex-shrink-0">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">All Tickets</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tickets.length} total</p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-3 rounded-xl cursor-pointer transition-all ${
                        selectedTicket.id === ticket.id
                          ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg border-2 border-violet-400'
                          : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <h4 className={`text-xs font-semibold line-clamp-2 flex-1 ${
                          selectedTicket.id === ticket.id ? 'text-white' : 'text-slate-900 dark:text-white'
                        }`}>
                          {ticket.subject || `Ticket #${ticket.id.slice(-8)}`}
                        </h4>
                        {selectedTicket.id !== ticket.id && (
                          <div className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${getStatusColor(ticket.status)}`}>
                            {ticket.status}
                          </div>
                        )}
                      </div>
                      <p className={`text-[10px] line-clamp-2 mb-1.5 ${
                        selectedTicket.id === ticket.id ? 'text-white/80' : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {ticket.description || 'No description'}
                      </p>
                      <p className={`text-[10px] ${
                        selectedTicket.id === ticket.id ? 'text-white/70' : 'text-slate-500 dark:text-slate-500'
                      }`}>
                        {formatDate(ticket.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side - Ticket Details + Conversation */}
              <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
                {loadingDetails ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-gray-400 dark:text-gray-500 text-sm">Loading ticket details...</div>
                  </div>
                ) : ticketDetails ? (
                  <>
                    {/* Ticket Details Section - Compact (Hidden on Mobile) */}
                    <div className="hidden sm:block px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 flex-shrink-0">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-violet-200 dark:border-violet-800/50 shadow-sm">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Calendar className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Created</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">{formatDate(ticketDetails.createdAt)}</p>
                        </div>

                        {ticketDetails.assignee && (
                          <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-violet-200 dark:border-violet-800/50 shadow-sm">
                            <div className="flex items-center gap-1.5 mb-1">
                              <UserCheck className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Assigned To</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">{ticketDetails.assignee.name}</p>
                            {ticketDetails.assignee.email && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{ticketDetails.assignee.email}</p>
                            )}
                          </div>
                        )}

                        {ticketDetails.department && (
                          <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-violet-200 dark:border-violet-800/50 shadow-sm">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Building2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Department</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">{ticketDetails.department.name}</p>
                          </div>
                        )}

                        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-violet-200 dark:border-violet-800/50 shadow-sm">
                          <div className="flex items-center gap-1.5 mb-1">
                            <MessageSquare className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Messages</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                            {ticketDetails.messages?.length || 0} {ticketDetails.messages?.length === 1 ? 'msg' : 'msgs'}
                          </p>
                        </div>

                        {ticketDetails.lastMessageAt && (
                          <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-violet-200 dark:border-violet-800/50 shadow-sm">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Clock className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Last Activity</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">{formatDate(ticketDetails.lastMessageAt)}</p>
                          </div>
                        )}

                        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-violet-200 dark:border-violet-800/50 shadow-sm">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Tag className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Ticket ID</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white font-mono leading-tight">#{ticketDetails.id.slice(-12)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Conversation Section - Full Screen on Mobile */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {/* Conversation Header - Hidden on Mobile */}
                      <div className="hidden sm:block px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Conversation</h3>
                      </div>

                      {/* Messages - WhatsApp Style */}
                      <div 
                        ref={messagesContainerRef}
                        className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 sm:py-4 bg-[#EFEAE2] dark:bg-[#0B141A]"
                        style={{
                          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'grid\' width=\'100\' height=\'100\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 100 0 L 0 0 0 100\' fill=\'none\' stroke=\'%23e5ddd5\' stroke-width=\'1\' opacity=\'0.3\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100\' height=\'100\' fill=\'url(%23grid)\'/%3E%3C/svg%3E")',
                          backgroundSize: '50px 50px'
                        }}
                      >
                        {ticketDetails.messages && ticketDetails.messages.length > 0 ? (
                          ticketDetails.messages.map((message, index) => {
                            const isCustomer = message.senderType === 'customer';
                            const prevMessage = index > 0 ? ticketDetails.messages[index - 1] : null;
                            const nextMessage = index < ticketDetails.messages.length - 1 ? ticketDetails.messages[index + 1] : null;
                            const isSameSender = prevMessage && prevMessage.senderType === message.senderType;
                            
                            // Show date divider when date changes or it's the first message
                            const showTime = (() => {
                              if (index === 0) return true;
                              if (!prevMessage) return true;
                              
                              const currentDate = new Date(message.createdAt);
                              const prevDate = new Date(prevMessage.createdAt);
                              
                              // Get date parts in IST
                              const currentIST = new Intl.DateTimeFormat('en-IN', {
                                timeZone: 'Asia/Kolkata',
                                year: 'numeric',
                                month: 'numeric',
                                day: 'numeric'
                              }).formatToParts(currentDate);
                              
                              const prevIST = new Intl.DateTimeFormat('en-IN', {
                                timeZone: 'Asia/Kolkata',
                                year: 'numeric',
                                month: 'numeric',
                                day: 'numeric'
                              }).formatToParts(prevDate);
                              
                              const currentDateStr = `${currentIST.find(p => p.type === 'year').value}-${currentIST.find(p => p.type === 'month').value}-${currentIST.find(p => p.type === 'day').value}`;
                              const prevDateStr = `${prevIST.find(p => p.type === 'year').value}-${prevIST.find(p => p.type === 'month').value}-${prevIST.find(p => p.type === 'day').value}`;
                              
                              // Show divider if date changed
                              return currentDateStr !== prevDateStr;
                            })();
                            
                            return (
                              <div key={message.id} className="mb-0.5">
                                {showTime && (
                                  <div className="flex justify-center my-3">
                                    <span className="text-xs text-gray-600 dark:text-gray-400 bg-white/90 dark:bg-slate-800/90 px-2.5 py-1 rounded-full shadow-sm">
                                      {formatDate(message.createdAt)}
                                    </span>
                                  </div>
                                )}
                                <div
                                  className={`flex ${isCustomer ? 'justify-end' : 'justify-start'} mb-0.5 group`}
                                >
                                  <div className={`flex items-end gap-1 max-w-[85%] sm:max-w-[75%] ${isCustomer ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {/* WhatsApp-style message bubble */}
                                    <div
                                      className={`relative px-2.5 py-1.5 sm:px-3 sm:py-2 ${
                                        isCustomer
                                          ? 'bg-[#DCF8C6] dark:bg-[#005C4B] text-gray-900 dark:text-white'
                                          : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]'
                                      }`}
                                      style={{
                                        borderRadius: isCustomer
                                          ? isSameSender && prevMessage?.senderType === 'customer'
                                            ? '7.5px 7.5px 1.5px 7.5px' // Connected to previous
                                            : '7.5px 7.5px 1.5px 7.5px' // First in group with tail
                                          : isSameSender && prevMessage?.senderType !== 'customer'
                                            ? '7.5px 7.5px 7.5px 1.5px' // Connected to previous
                                            : '7.5px 7.5px 7.5px 1.5px' // First in group with tail
                                      }}
                                    >
                                      {/* Reply preview if message is a reply */}
                                      {message.replyTo && (
                                        <div 
                                          className={`mb-2 p-2 rounded border-l-4 ${
                                            isCustomer
                                              ? 'bg-white/30 dark:bg-white/10 border-white/50'
                                              : 'bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600'
                                          }`}
                                        >
                                          <div className="text-xs font-semibold opacity-80 mb-1">
                                            {message.replyTo.senderType === 'customer' ? 'You' : (message.replyTo.senderName || 'Support Agent')}
                                          </div>
                                          <div className="text-xs opacity-70 line-clamp-2">
                                            {message.replyTo.content || 'Message'}
                                          </div>
                                        </div>
                                      )}

                                      {/* Attachment Preview */}
                                      {message.metadata && message.metadata.type && (
                                        <div className="mb-2">
                                          {message.metadata.type === 'image' && (
                                            <img 
                                              src={message.metadata.url} 
                                              alt={message.metadata.fileName || 'Image'} 
                                              className="max-w-full max-h-64 sm:max-h-80 rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                              onClick={() => window.open(message.metadata.url, '_blank')}
                                            />
                                          )}
                                          {message.metadata.type === 'video' && (
                                            <video 
                                              src={message.metadata.url} 
                                              controls
                                              className="max-w-full max-h-64 sm:max-h-80 rounded-lg"
                                              preload="metadata"
                                            >
                                              Your browser does not support the video tag.
                                            </video>
                                          )}
                                          {message.metadata.type === 'file' && (
                                            <a
                                              href={message.metadata.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 p-2.5 bg-white/20 dark:bg-white/10 rounded hover:bg-white/30 transition-colors"
                                            >
                                              <File className="w-5 h-5 flex-shrink-0" />
                                              <div className="flex-1 min-w-0">
                                                <div className="text-xs font-medium truncate">{message.metadata.fileName || 'File'}</div>
                                                <div className="text-[10px] text-gray-500 dark:text-gray-400">Click to download</div>
                                              </div>
                                            </a>
                                          )}
                                        </div>
                                      )}

                                      {/* Message content */}
                                      {message.content && (
                                        <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed break-words">
                                          {message.content}
                                        </p>
                                      )}

                                      {/* Timestamp - WhatsApp style (bottom right, small) */}
                                      <div className="flex items-center justify-end gap-1 mt-1">
                                        <span className={`text-[11px] leading-none ${
                                          isCustomer 
                                            ? 'text-gray-700 dark:text-gray-300' 
                                            : 'text-gray-600 dark:text-gray-400'
                                        }`}>
                                          {formatMessageTime(message.createdAt)}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Reply button (on hover) - Only show on desktop */}
                                    <button
                                      onClick={() => handleReply(message)}
                                      className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                                      title="Reply"
                                    >
                                      <Reply className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                            <div className="text-center">
                              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50 dark:opacity-40" />
                              <p className="dark:text-gray-400">No messages yet</p>
                              <p className="text-xs mt-1 dark:text-gray-500">Start the conversation below</p>
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Reply Preview */}
                      {replyingTo && (
                        <div className="px-3 sm:px-4 py-2 bg-gray-100 dark:bg-slate-700 border-t border-gray-200 dark:border-slate-600 flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-0.5 h-8 bg-violet-600 rounded-full"></div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                Replying to {replyingTo.senderType === 'customer' ? 'You' : (replyingTo.senderName || 'Support Agent')}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                {replyingTo.content || 'Message'}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={cancelReply}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                          >
                            <XIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </button>
                        </div>
                      )}

                      {/* File Preview (Draft Mode) */}
                      {selectedFile && (
                        <div className="px-2 sm:px-4 py-2 bg-gray-100 dark:bg-slate-700 border-t border-gray-200 dark:border-slate-600">
                          <div className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                            {selectedFile.type === 'image' && (
                              <img
                                src={selectedFile.previewUrl}
                                alt={selectedFile.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            {selectedFile.type === 'video' && (
                              <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                </svg>
                              </div>
                            )}
                            {selectedFile.type === 'file' && (
                              <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {selectedFile.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {selectedFile.type === 'image' ? 'Image' : selectedFile.type === 'video' ? 'Video' : 'File'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedFile.previewUrl) {
                                  URL.revokeObjectURL(selectedFile.previewUrl);
                                }
                                setSelectedFile(null);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
                              title="Remove file"
                            >
                              <XIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Message Input - WhatsApp Style */}
                      <div className="px-2 sm:px-4 py-2 sm:py-3 bg-[#F0F2F5] dark:bg-[#202C33] border-t border-gray-200 dark:border-slate-700 flex-shrink-0 safe-area-inset-bottom">
                        <div className="flex gap-1.5 sm:gap-2 items-end">
                          {/* File Attachment Button */}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || sendingMessage || ticketDetails.status === 'closed' || ticketDetails.status === 'resolved'}
                            className="p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Attach file"
                          >
                            {isUploading ? (
                              <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Paperclip className="w-5 h-5 sm:w-6 sm:h-6" />
                            )}
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(file);
                              }
                              e.target.value = ''; // Reset input
                            }}
                            className="hidden"
                            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                          />

                          {/* Emoji Picker */}
                          <div className="relative">
                            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                          </div>

                          {/* Text Input - WhatsApp Style */}
                          <div className="flex-1 relative">
                            <textarea
                              value={newMessage}
                              onChange={(e) => {
                                setNewMessage(e.target.value);
                                // Auto-resize textarea
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                              }}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendMessage();
                                }
                              }}
                              placeholder="Type a message"
                              rows={1}
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-3xl bg-white dark:bg-[#2A3942] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none transition-all text-sm sm:text-base resize-none overflow-y-auto border-0"
                              disabled={sendingMessage || ticketDetails.status === 'closed' || ticketDetails.status === 'resolved'}
                              style={{ 
                                minHeight: '44px',
                                maxHeight: '120px',
                                lineHeight: '1.4'
                              }}
                            />
                          </div>

                          {/* Send Button - WhatsApp Style */}
                          <button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim() || sendingMessage || ticketDetails.status === 'closed' || ticketDetails.status === 'resolved'}
                            className={`p-2.5 sm:p-3 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 shadow-sm ${
                              newMessage.trim()
                                ? 'bg-[#25D366] hover:bg-[#20BA5A] text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            <Send className="w-5 h-5 sm:w-6 sm:h-6" />
                          </button>
                        </div>
                        {(ticketDetails.status === 'closed' || ticketDetails.status === 'resolved') && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                            This ticket is {ticketDetails.status}. You cannot send messages.
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-gray-400 dark:text-gray-400 text-sm">Failed to load ticket details</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* File Size Error Modal */}
      {fileSizeError && typeof window !== 'undefined' && document.body && createPortal(
        <div 
          className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={() => setFileSizeError(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 mx-2 sm:mx-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
                  <span>File Size Exceeded</span>
                </h3>
                <button
                  onClick={() => setFileSizeError(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex-shrink-0"
                >
                  <XIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              <div className="space-y-2 sm:space-y-3">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  The selected file is <span className="font-semibold text-slate-900 dark:text-white">{fileSizeError.fileSizeMB} MB</span>.
                </p>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  The allowed file size limit is <span className="font-semibold text-slate-900 dark:text-white">50 MB</span>.
                </p>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 sm:p-4 mt-3 sm:mt-4">
                  <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Please try one of the following:</p>
                  <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                    <li>Compress the file to reduce its size</li>
                    <li>Upload it on Google Drive and send the drive link</li>
                  </ul>
                </div>
              </div>
              <div className="flex justify-end mt-4 sm:mt-6">
                <button
                  onClick={() => setFileSizeError(null)}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors text-sm sm:text-base font-medium w-full sm:w-auto"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </>
  );
}
