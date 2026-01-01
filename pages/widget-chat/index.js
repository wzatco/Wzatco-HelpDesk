// New Chat Widget - Main Entry Point
'use client';

import { useState, useEffect } from 'react';
import ChatWidgetContainer from '../../components/widget/chat/ChatWidgetContainer';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);

  // Load widget state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('chat-widget-open');
      if (savedState === 'true') {
        setIsOpen(true);
        setIsMinimized(false);
      }
    }
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    setIsMinimized(!isOpen);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chat-widget-open', (!isOpen).toString());
    }
  };

  return (
    <>
      {/* Floating Icon with Hover Text */}
      {isMinimized && (
        <div className="fixed bottom-6 right-6 z-[9998] group">
          <button
            onClick={handleToggle}
            className="relative w-14 h-14 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-110"
            aria-label="Open Support Widget"
          >
            {/* Chat icon */}
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </button>
          
          {/* Hover Text */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
            <div className="relative bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-xs font-medium">
              Need help?
              <div className="absolute left-full top-1/2 -translate-y-1/2">
                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[6px] border-l-gray-900 border-b-[6px] border-b-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Widget Container */}
      {isOpen && (
        <ChatWidgetContainer
          isOpen={isOpen}
          onClose={() => {
            setIsOpen(false);
            setIsMinimized(true);
            if (typeof window !== 'undefined') {
              localStorage.setItem('chat-widget-open', 'false');
            }
          }}
          position="bottom-right"
        />
      )}
    </>
  );
}

