import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AgentLayout from '../../../components/agent/universal/AgentLayout';
import InternalChatLayout from '../../../components/internal-chat/InternalChatLayout';
import PageHead from '../../../components/admin/PageHead';

/**
 * Agent Chat Page
 * Internal messaging interface for agents
 * 
 * NOTE: This page should match pages/admin/chat/index.js exactly.
 * Both use InternalChatLayout which handles instant chat selection via handleSelectChat.
 * The handleSelectChat function accepts either a chatId (string) or full chat object.
 */
export default function AgentChatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch agent profile
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/agent/profile');
        if (response.ok) {
          const data = await response.json();
          if (data?.success && data?.data) {
            setCurrentUser({
              id: data.data.id,
              type: 'agent',
              name: data.data.name || 'Agent',
              email: data.data.email,
              avatarUrl: data.data.avatarUrl || null
            });
          }
        } else {
          console.error('Failed to fetch agent profile');
        }
      } catch (error) {
        console.error('Error fetching agent profile:', error);
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
      <AgentLayout currentPage="chat" fullWidth={true}>
        <PageHead title="Internal Chat" />
        <div className="flex h-screen items-center justify-center">
          <div className="text-slate-500 dark:text-slate-400">Loading...</div>
        </div>
      </AgentLayout>
    );
  }

  if (!currentUser) {
    return (
      <AgentLayout currentPage="chat" fullWidth={true}>
        <PageHead title="Internal Chat" />
        <div className="flex h-screen items-center justify-center">
          <div className="text-red-500">Failed to load user profile. Please refresh the page.</div>
        </div>
      </AgentLayout>
    );
  }

  return (
    <AgentLayout currentPage="chat" fullWidth={true}>
      <PageHead title="Internal Chat" />
      <InternalChatLayout currentUser={currentUser} initialChatId={initialChatId} />
    </AgentLayout>
  );
}

