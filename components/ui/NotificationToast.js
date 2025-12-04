import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function NotificationToast({ notification, onClose }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (notification?.type) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!mounted || !notification?.type || typeof window === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed top-24 right-6 z-[10000] animate-slide-in-right">
      <div className={`px-5 py-4 rounded-xl shadow-2xl border-2 backdrop-blur-sm min-w-[320px] max-w-[500px] ${
        notification.type === 'success' 
          ? 'bg-green-500 dark:bg-green-600 border-green-400 dark:border-green-500 text-white' 
          : notification.type === 'error'
          ? 'bg-red-500 dark:bg-red-600 border-red-400 dark:border-red-500 text-white'
          : 'bg-blue-500 dark:bg-blue-600 border-blue-400 dark:border-blue-500 text-white'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {notification.type === 'success' ? (
              <Check className="w-5 h-5 text-white flex-shrink-0" />
            ) : (
              <X className="w-5 h-5 text-white flex-shrink-0" />
            )}
            <p className="font-semibold text-sm flex-1">{notification.message}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close notification"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

