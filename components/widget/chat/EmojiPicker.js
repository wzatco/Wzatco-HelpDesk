// Emoji Picker Component using emoji-picker-react
'use client';

import { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';
import EmojiPickerLib from 'emoji-picker-react';

export default function EmojiPicker({ onEmojiSelect, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [pickerHeight, setPickerHeight] = useState(400);
  const pickerRef = useRef(null);

  useEffect(() => {
    // Check dark mode
    const checkDarkMode = () => {
      if (typeof window !== 'undefined') {
        setIsDark(document.documentElement.classList.contains('dark'));
        setPickerHeight(window.innerWidth < 640 ? 350 : 400);
      }
    };

    checkDarkMode();

    // Watch for dark mode changes
    const observer = new MutationObserver(checkDarkMode);
    if (typeof window !== 'undefined') {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Update height on resize
      const handleResize = () => {
        setPickerHeight(window.innerWidth < 640 ? 350 : 400);
      };
      window.addEventListener('resize', handleResize);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  const handleEmojiClick = (emojiData) => {
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Smile className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed sm:absolute bottom-16 sm:bottom-full right-2 sm:right-0 sm:mb-2 z-50 shadow-2xl rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700">
          <div className="w-[calc(100vw-1rem)] sm:w-[350px] max-w-[350px]">
            <EmojiPickerLib
              onEmojiClick={handleEmojiClick}
              width="100%"
              height={pickerHeight}
              theme={isDark ? 'dark' : 'light'}
              previewConfig={{
                showPreview: false
              }}
              skinTonesDisabled={false}
              searchDisabled={false}
              lazyLoadEmojis={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}

