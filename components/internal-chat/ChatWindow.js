import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocketListener } from '../../hooks/useSocketListener';
import { getAgentSocket } from '../../lib/agentSocket';
import MessageBubble from './MessageBubble';
import { Button } from '../ui/button';
import UserAvatar from './UserAvatar';
import EmojiPicker from 'emoji-picker-react';

/**
 * ChatWindow Component
 * Displays messages for a specific chat with input area and real-time updates
 */
export default function ChatWindow({ chatId, currentUser, otherParticipant }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Fetch messages from API
  const fetchMessages = useCallback(async (silent = false) => {
    if (!chatId) return;

    if (!silent) setLoading(true);
    try {
      const response = await fetch(`/api/internal/chats/${chatId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      // Error fetching messages
    } finally {
      if (!silent) setLoading(false);
    }
  }, [chatId]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Join socket room for this chat
  useEffect(() => {
    if (!chatId) return;
    
    const socket = getAgentSocket();
    if (!socket) {
      return;
    }

    // Ensure socket is connected
    if (!socket.connected) {
      socket.connect();
      
      // Wait for connection before joining room
      const handleConnect = () => {
        socket.emit('join_internal_chat', chatId);
      };
      
      socket.once('connect', handleConnect);
      
      return () => {
        socket.off('connect', handleConnect);
        if (socket.connected) {
          socket.emit('leave_internal_chat', chatId);
        }
      };
    } else {
      // Socket already connected, join immediately
      socket.emit('join_internal_chat', chatId);
      
      return () => {
        socket.emit('leave_internal_chat', chatId);
      };
    }
  }, [chatId]);

  // Listen for new messages via socket
  useSocketListener('internal:message:new', useCallback((messageData) => {
    if (messageData.chatId === chatId) {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === messageData.id)) {
          return prev;
        }
        return [...prev, messageData];
      });
      scrollToBottom();
    }
  }, [chatId]));

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setSelectedFile({
        file,
        previewUrl,
        type: file.type,
        name: file.name,
        size: file.size
      });
    } else {
      setSelectedFile({
        file,
        type: file.type,
        name: file.name,
        size: file.size
      });
    }
  };

  // Remove selected file
  const handleRemoveFile = () => {
    if (selectedFile?.previewUrl) {
      URL.revokeObjectURL(selectedFile.previewUrl);
    }
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload file and get URL
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      const data = await response.json();
      if (data.success && data.attachment) {
        return {
          url: data.attachment.url,
          type: data.attachment.type || file.type,
          name: data.attachment.fileName || file.name,
          size: file.size
        };
      }
      throw new Error('Invalid response from server');
    } catch (error) {
      throw error;
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if ((!messageText.trim() && !selectedFile) || sending || !chatId) return;

    setSending(true);
    setUploading(true);

    try {
      let attachments = [];

      // Upload file if selected
      if (selectedFile) {
        try {
          const uploadedFile = await uploadFile(selectedFile.file);
          attachments.push(uploadedFile);
        } catch (error) {
          alert('Failed to upload file. Please try again.');
          setSending(false);
          setUploading(false);
          return;
        }
      }

      // Send message to API
      const response = await fetch(`/api/internal/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageText.trim() || '',
          attachments: attachments.length > 0 ? attachments : undefined
        }),
      });

      if (response.ok) {
        // Clear input
        setMessageText('');
        handleRemoveFile();
        
        // Refresh messages to get the latest from server
        fetchMessages(true);
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to send message');
      }
    } catch (error) {
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  // Handle Enter key (Shift+Enter for new line)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Handle emoji selection
  const handleEmojiClick = (emojiData) => {
    setMessageText(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#efeae2] dark:bg-[#0b141a] text-gray-500 dark:text-gray-400">
        <div className="text-center max-w-md px-8">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-xl font-medium mb-2 text-gray-700 dark:text-gray-300">Select a conversation</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Choose a chat from the sidebar to start messaging</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#efeae2] dark:bg-[#0b141a]">
        <div className="text-gray-500 dark:text-gray-400">Loading messages...</div>
      </div>
    );
  }

  const isOwnMessage = (message) => {
    return message.senderId === currentUser?.id && message.senderType === currentUser?.type;
  };

  return (
    <div className="flex flex-col h-full bg-[#efeae2] dark:bg-[#0b141a] relative">
      {/* Chat Header - Fixed */}
      <div className="sticky top-0 z-10 h-16 flex items-center px-4 bg-gray-100 dark:bg-[#202c33] border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 w-full">
          <UserAvatar
            name={otherParticipant?.name || 'Unknown'}
            src={otherParticipant?.avatarUrl || otherParticipant?.avatar}
            size="md"
            className="flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {otherParticipant?.name || 'Unknown'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
              {otherParticipant?.type === 'admin' ? 'Admin' : 'Agent'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#efeae2] dark:bg-[#0b141a] bg-opacity-100">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">No messages yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={isOwnMessage(message)}
                senderName={message.senderName || (message.senderType === 'admin' ? 'Admin' : 'Agent')}
                senderAvatar={null} // TODO: Add avatar support
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="px-4 pt-2 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
          <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded-lg">
            {selectedFile.previewUrl ? (
              <img
                src={selectedFile.previewUrl}
                alt="Preview"
                className="h-16 w-16 object-cover rounded"
              />
            ) : (
              <div className="h-16 w-16 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                <span className="text-2xl">📎</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 h-8 w-8 p-0"
            >
              ✕
            </Button>
          </div>
        </div>
      )}

      {/* Input Area - Fixed Bottom - WhatsApp Style */}
      <div className="sticky bottom-0 bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-2.5 flex items-center gap-1 relative border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSendMessage} className="flex items-center w-full gap-1 relative">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip"
          />
          
          {/* Emoji Button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="flex-shrink-0 h-9 w-9 rounded-full hover:bg-gray-200 dark:hover:bg-[#2a3942] flex items-center justify-center transition-colors"
            disabled={sending || uploading}
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Emoji Picker Popup */}
          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-16 left-0 z-50">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                width={350}
                height={400}
              />
            </div>
          )}

          {/* Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 h-9 w-9 rounded-full hover:bg-gray-200 dark:hover:bg-[#2a3942] flex items-center justify-center transition-colors"
            disabled={sending || uploading}
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Input Field Wrapper - WhatsApp Style */}
          <div className="flex-1 rounded-3xl bg-white dark:bg-[#2a3942] flex items-center px-4 py-2 min-h-[42px] max-h-[120px]">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message"
              className="flex-1 w-full min-h-[20px] max-h-[120px] resize-none border-0 bg-transparent focus:ring-0 focus:outline-none p-0 text-sm text-black dark:text-[#e9edef] placeholder:text-gray-500 dark:placeholder:text-gray-400"
              disabled={sending || uploading}
              rows={1}
              style={{ lineHeight: '1.4' }}
            />
          </div>

          {/* Send Button - Only show when there's content */}
          {(messageText.trim() || selectedFile) ? (
            <button
              type="submit"
              disabled={sending || uploading}
              className="flex-shrink-0 h-9 w-9 bg-[#00a884] hover:bg-[#008f70] rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {uploading || sending ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          ) : null}
        </form>
      </div>
    </div>
  );
}

