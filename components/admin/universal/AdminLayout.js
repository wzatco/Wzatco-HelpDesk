import { useState } from 'react';
import { useRouter } from 'next/router';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import AdminFooter from './AdminFooter';
import PageTransition from './PageTransition';

export default function AdminLayout({ children, currentPage, fullWidth = false }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const handleMenuClick = () => {
    setSidebarOpen(true);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-slate-900 flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
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
            <div className={`py-8 min-h-full ${fullWidth ? 'px-0' : 'px-4 sm:px-6 lg:px-8'}`}>
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
