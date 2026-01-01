/**
 * New Message Toast Notifications
 * Displays stacked toast notifications for new customer messages
 * Shows when customer sends a message and agent is not viewing that ticket
 */

import { useRouter } from 'next/router';
import { createPortal } from 'react-dom';
import { MessageSquare, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function NewMessageToasts({ toasts, onDismiss }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-dismiss toasts after 10 seconds
  useEffect(() => {
    if (toasts.length === 0) return;

    const timers = toasts.map(toast => {
      return setTimeout(() => {
        onDismiss(toast.id);
      }, 10000); // 10 seconds
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [toasts, onDismiss]);

  const handleToastClick = (ticketId) => {
    router.push(`/agent/tickets/${ticketId}`);
  };

  if (!mounted || toasts.length === 0) {
    return null;
  }

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-3 pointer-events-none">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-blue-200 dark:border-blue-700 overflow-hidden max-w-sm animate-slide-in-right"
          style={{
            animation: `slideInRight 0.3s ease-out ${index * 0.1}s both`
          }}
        >
          <div 
            className="p-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
            onClick={() => handleToastClick(toast.ticketId)}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    New Message from {toast.customerName}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(toast.id);
                    }}
                    className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    aria-label="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">
                  {toast.ticketNumber}
                </p>

                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                  {toast.message}
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Click to view ticket
                </p>
              </div>
            </div>
          </div>

          {/* Progress bar (auto-dismiss indicator) */}
          <div className="h-1 bg-blue-100 dark:bg-blue-900 overflow-hidden">
            <div 
              className="h-full bg-blue-500 dark:bg-blue-400"
              style={{
                animation: 'progressBar 10s linear forwards'
              }}
            />
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes progressBar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </div>,
    document.body
  );
}
