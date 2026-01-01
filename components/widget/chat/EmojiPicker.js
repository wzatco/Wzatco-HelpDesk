// Emoji Picker Component using emoji-picker-react
'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Smile } from 'lucide-react';
import EmojiPickerLib from 'emoji-picker-react';

export default function EmojiPicker({ onEmojiSelect, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [pickerHeight, setPickerHeight] = useState(400);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, right: 0, bottom: 0, height: 0 });
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);

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
      // Check if click is outside both the button and the picker content (portal)
      const button = buttonRef.current;
      const pickerElement = document.querySelector('[data-emoji-picker]');
      
      if (button && pickerElement) {
        const isClickOnButton = button.contains(event.target);
        const isClickOnPicker = pickerElement.contains(event.target);
        
        if (!isClickOnButton && !isClickOnPicker) {
          setIsOpen(false);
        }
      } else if (button && !button.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const updateButtonPosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setButtonPosition({
          top: rect.top,
          right: window.innerWidth - rect.right,
          bottom: window.innerHeight - rect.bottom,
          height: rect.height
        });
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Update height on resize
      const handleResize = () => {
        setPickerHeight(window.innerWidth < 640 ? 350 : 400);
        updateButtonPosition();
      };
      
      updateButtonPosition();
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', updateButtonPosition, true);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', updateButtonPosition, true);
      };
    }
  }, [isOpen]);

  const handleEmojiClick = (emojiData) => {
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
  };

  const pickerContent = isOpen && typeof window !== 'undefined' && document.body ? (() => {
    const isMobile = window.innerWidth < 640;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate picker width - ensure it fits within viewport with margins
    const horizontalMargin = 16; // 8px on each side
    const maxPickerWidth = 350;
    const pickerWidth = isMobile 
      ? Math.max(280, Math.min(viewportWidth - horizontalMargin, maxPickerWidth))
      : maxPickerWidth;
    
    // Calculate horizontal position (right edge)
    // Ensure it doesn't go outside viewport
    let rightPosition = 8; // Default margin
    if (isMobile) {
      // On mobile, try to align to button but ensure it stays within viewport
      const buttonRight = buttonPosition.right;
      // Check if picker would overflow on the left side
      const pickerLeftEdge = viewportWidth - pickerWidth - buttonRight;
      if (pickerLeftEdge < 8) {
        // If it would overflow, position it with margin from right edge
        rightPosition = 8;
      } else {
        // Otherwise, align to button
        rightPosition = Math.max(8, buttonRight);
      }
    } else {
      // On desktop, align to button
      rightPosition = Math.max(8, buttonPosition.right);
    }
    
    // Calculate vertical position
    // Position ABOVE the button (using bottom property)
    const spacingFromButton = 8;
    const buttonHeight = buttonPosition.height || 40; // Default button height if not available
    const buttonTop = viewportHeight - buttonPosition.bottom;
    const availableHeightAboveButton = buttonTop - spacingFromButton - 16; // Leave margin from top
    
    // Calculate picker height - ensure it fits above button and within viewport
    const maxPickerHeight = Math.min(
      pickerHeight,
      availableHeightAboveButton,
      viewportHeight - 120 // Leave space for header/other UI elements
    );
    
    // Position bottom edge above the button
    // buttonPosition.bottom is distance from viewport bottom to button bottom
    // We want picker bottom to be above button top, so:
    // bottom = buttonPosition.bottom + buttonHeight + spacingFromButton
    const bottomPosition = buttonPosition.bottom + buttonHeight + spacingFromButton;
    
    return (
      <div 
        data-emoji-picker
        className="fixed z-[10001] shadow-2xl rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700" 
        style={{ 
          bottom: `${bottomPosition}px`,
          right: `${rightPosition}px`,
          width: `${pickerWidth}px`,
          maxHeight: `${maxPickerHeight}px`,
          maxWidth: `${pickerWidth}px`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <EmojiPickerLib
          onEmojiClick={handleEmojiClick}
          width="100%"
          height={maxPickerHeight}
          theme={isDark ? 'dark' : 'light'}
          previewConfig={{
            showPreview: false
          }}
          skinTonesDisabled={false}
          searchDisabled={false}
          lazyLoadEmojis={true}
        />
      </div>
    );
  })() : null;

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Smile className="w-5 h-5" />
      </button>

      {typeof window !== 'undefined' && document.body && createPortal(pickerContent, document.body)}
    </div>
  );
}

