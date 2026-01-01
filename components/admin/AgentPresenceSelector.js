import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Circle, 
  Clock, 
  AlertCircle, 
  Moon, 
  Calendar, 
  Video, 
  BellOff,
  ChevronDown
} from 'lucide-react';
import AgentPresenceIndicator from './AgentPresenceIndicator';

const PRESENCE_OPTIONS = [
  { value: 'online', label: 'Online', icon: Circle, color: 'text-green-600 dark:text-green-400' },
  { value: 'away', label: 'Away', icon: Clock, color: 'text-yellow-600 dark:text-yellow-400' },
  { value: 'busy', label: 'Busy', icon: AlertCircle, color: 'text-orange-600 dark:text-orange-400' },
  { value: 'in_meeting', label: 'In Meeting', icon: Video, color: 'text-purple-600 dark:text-purple-400' },
  { value: 'dnd', label: 'Do Not Disturb', icon: BellOff, color: 'text-red-600 dark:text-red-400' },
  { value: 'on_leave', label: 'On Leave', icon: Moon, color: 'text-blue-600 dark:text-blue-400' },
  { value: 'offline', label: 'Offline', icon: Circle, color: 'text-slate-600 dark:text-slate-400' }
];

export default function AgentPresenceSelector({ 
  agentId, 
  currentStatus = 'offline',
  onStatusChange,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [updating, setUpdating] = useState(false);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen && buttonRef.current && typeof window !== 'undefined') {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const dropdownHeight = 300; // Approximate dropdown height
      
      // Calculate position
      let top = rect.bottom + window.scrollY + 8;
      let left = rect.left + window.scrollX;
      
      // Adjust if dropdown would go below viewport
      if (rect.bottom + dropdownHeight > viewportHeight) {
        top = rect.top + window.scrollY - dropdownHeight - 8;
      }
      
      // Adjust if dropdown would go off right edge
      const dropdownWidth = Math.max(rect.width, 200);
      if (left + dropdownWidth > viewportWidth) {
        left = viewportWidth - dropdownWidth - 10;
      }
      
      // Ensure dropdown doesn't go off left edge
      if (left < 10) {
        left = 10;
      }
      
      setPosition({
        top: Math.max(10, top),
        left: left,
        width: dropdownWidth
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isOpen &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === currentStatus || updating) return;

    setUpdating(true);
    try {
      // Update via API
      const response = await fetch(`/api/admin/agents/${agentId}/presence`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ presenceStatus: newStatus })
      });

      const data = await response.json();

      if (response.ok) {
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
        setIsOpen(false);
      } else {
        console.error('Failed to update presence:', data.message);
      }
    } catch (error) {
      console.error('Error updating presence:', error);
    } finally {
      setUpdating(false);
    }
  };

  const currentOption = PRESENCE_OPTIONS.find(opt => opt.value === currentStatus) || PRESENCE_OPTIONS[PRESENCE_OPTIONS.length - 1];

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        disabled={updating}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md transition-all ${className} ${updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <AgentPresenceIndicator 
          presenceStatus={currentStatus} 
          showLabel={false}
          size="small"
        />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {currentOption.label}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && typeof window !== 'undefined' && document.body && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden min-w-[200px]"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${Math.max(position.width, 200)}px`,
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          <div className="py-1">
            {PRESENCE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = option.value === currentStatus;
              
              return (
                <button
                  key={option.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(option.value);
                  }}
                  disabled={updating || isSelected}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors ${
                    isSelected 
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' 
                      : 'text-slate-700 dark:text-slate-300'
                  } ${updating || isSelected ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                >
                  <Icon className={`w-4 h-4 ${option.color}`} />
                  <span className="text-sm font-medium flex-1">{option.label}</span>
                  {isSelected && (
                    <div className="w-2 h-2 bg-violet-600 dark:bg-violet-400 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

