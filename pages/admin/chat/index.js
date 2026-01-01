import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import InternalChatLayout from '../../../components/internal-chat/InternalChatLayout';
import PageHead from '../../../components/admin/PageHead';

/**
 * Admin Chat Page
 * Internal messaging interface for admins
 */
export default function AdminChatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch admin profile
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/admin/profile');
        if (response.ok) {
          const data = await response.json();
          if (data?.data) {
            setCurrentUser({
              id: data.data.id,
              type: 'admin',
              name: data.data.name || 'Admin',
              email: data.data.email,
              avatarUrl: data.data.avatarUrl || null
            });
          }
        } else {
          console.error('Failed to fetch admin profile');
        }
      } catch (error) {
        console.error('Error fetching admin profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Get initialChatId from query params
  const initialChatId = router.query.chatId || null;

  if (loading) {
    return (
      <AdminLayout currentPage="chat" fullWidth={true}>
        <PageHead title="Internal Chat" />
        <div className="flex h-screen items-center justify-center">
          <div className="text-slate-500 dark:text-slate-400">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!currentUser) {
    return (
      <AdminLayout currentPage="chat" fullWidth={true}>
        <PageHead title="Internal Chat" />
        <div className="flex h-screen items-center justify-center">
          <div className="text-red-500">Failed to load user profile. Please refresh the page.</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentPage="chat" fullWidth={true}>
      <PageHead title="Internal Chat" />
      <InternalChatLayout currentUser={currentUser} initialChatId={initialChatId} />
    </AdminLayout>
  );
}

