// Customer Widget - Floating Button + Chat Widget Container
'use client';

import { useState, useEffect } from 'react';
import ChatWidgetContainer from './chat/ChatWidgetContainer';

export default function CustomerWidget() {
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
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9998] group">
          <button
            onClick={handleToggle}
            className="relative w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-110"
            aria-label="Open Support Widget"
          >
            {/* Three dots icon */}
            <div className="flex items-center justify-center space-x-1">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          </button>
          
          {/* Hover Text - Appears on hover */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
            <div className="relative bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-xs font-medium">
              Need help?
              {/* Arrow pointing to button */}
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

