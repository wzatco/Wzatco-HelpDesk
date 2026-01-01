import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import AdminFooter from './AdminFooter';
import PageTransition from './PageTransition';
import { useSocketListener } from '../../../hooks/useSocketListener';
import NotificationToast from '../../ui/NotificationToast';

export default function AdminLayout({ children, currentPage, fullWidth = false }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState({ type: null, message: '' });
  const router = useRouter();

  const handleMenuClick = () => {
    setSidebarOpen(true);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  // Listen for internal chat messages and show toast if not viewing that chat
  useSocketListener('internal:message:new', useCallback((messageData) => {
    // Check if user is currently viewing this specific chat
    const isViewingChat = router.pathname.includes('/chat') && 
                          router.query.chatId === messageData.chatId;
    
    // Only show toast if NOT viewing the chat
    if (!isViewingChat && messageData.senderName) {
      const messagePreview = messageData.content 
        ? (messageData.content.length > 80 ? messageData.content.substring(0, 80) + '...' : messageData.content)
        : (messageData.metadata?.attachments ? 'Sent an attachment' : 'Sent a message');
      
      setToastNotification({
        type: 'info',
        message: `New message from ${messageData.senderName}: ${messagePreview}`,
        link: `/admin/chat?chatId=${messageData.chatId}`,
        chatId: messageData.chatId
      });

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setToastNotification({ type: null, message: '' });
      }, 5000);
    }
  }, [router.pathname, router.query.chatId]));

  // Handle toast click - navigate to chat
  const handleToastClick = () => {
    if (toastNotification.link) {
      router.push(toastNotification.link);
      setToastNotification({ type: null, message: '' });
    }
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-slate-900 flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
      {/* Toast Notification */}
      {toastNotification.type && (
        <NotificationToast 
          notification={toastNotification} 
          onClose={() => setToastNotification({ type: null, message: '' })}
          onClick={handleToastClick}
        />
      )}

      {/* Header - Full Width */}
      <AdminHeader onMenuClick={handleMenuClick} currentPage={currentPage} />

      {/* Main Layout - Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <AdminSidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Page content */}
          <main className="flex-1 bg-gray-50 dark:bg-slate-900 overflow-y-auto min-h-0">
            <div className={`min-h-full ${fullWidth ? 'px-0 py-0' : 'px-4 sm:px-6 lg:px-8 py-8'}`}>
              <PageTransition>
                {children}
              </PageTransition>
            </div>
          </main>
          
          {/* Footer - Sticky to bottom (dashboard only) */}
          {router.pathname === '/admin' && <AdminFooter />}
        </div>
      </div>
    </div>
  );
}
