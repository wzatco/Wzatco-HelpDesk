/**
 * Ticket Assignment Toast Notifications
 * Displays stacked toast notifications in bottom-right corner for real-time ticket assignments
 * Automatically removes toasts after 10 seconds
 */

import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { Ticket, X, Bell, AlertCircle, CheckCircle } from 'lucide-react';

export default function TicketAssignmentToasts({ toasts, onDismiss }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof window === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[10000] flex flex-col-reverse gap-3 max-w-md">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}

function ToastItem({ toast, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Auto-dismiss after 10 seconds
    const timer = setTimeout(() => {
      handleDismiss();
    }, 10000);

    return () => clearTimeout(timer);
  }, [toast.id]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300); // Match animation duration
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-500 text-white border-red-400';
      case 'high':
        return 'bg-orange-500 text-white border-orange-400';
      case 'medium':
        return 'bg-yellow-500 text-white border-yellow-400';
      case 'low':
        return 'bg-green-500 text-white border-green-400';
      default:
        return 'bg-blue-500 text-white border-blue-400';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
      case 'high':
        return <AlertCircle className="w-5 h-5 flex-shrink-0" />;
      default:
        return <Ticket className="w-5 h-5 flex-shrink-0" />;
    }
  };

  return (
    <div
      className={`
        ${getPriorityColor(toast.priority)}
        px-4 py-3 rounded-xl shadow-2xl border-2 backdrop-blur-sm
        transform transition-all duration-300 ease-out cursor-pointer
        hover:scale-105 hover:shadow-3xl
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        ${!isExiting ? 'animate-slide-in-right' : ''}
      `}
      onClick={() => {
        // Navigate to ticket
        if (toast.ticketId) {
          window.location.href = `/agent/tickets/${toast.ticketId}`;
        }
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getPriorityIcon(toast.priority)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 animate-pulse" />
              <p className="font-bold text-sm">New Ticket Assigned</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="font-semibold text-sm mb-1 truncate">
            {toast.ticketNumber || toast.ticketId}
          </p>
          
          {toast.subject && (
            <p className="text-xs opacity-90 line-clamp-2 mb-1">
              {toast.subject}
            </p>
          )}

          {toast.customerName && (
            <p className="text-xs opacity-80">
              Customer: {toast.customerName}
            </p>
          )}

          {toast.assignedBy && (
            <p className="text-xs opacity-70 mt-1">
              Assigned by: {toast.assignedBy}
            </p>
          )}
        </div>
      </div>

      {/* Click hint */}
      <div className="mt-2 pt-2 border-t border-white/20">
        <p className="text-xs opacity-70 text-center">Click to view ticket</p>
      </div>
    </div>
  );
}
