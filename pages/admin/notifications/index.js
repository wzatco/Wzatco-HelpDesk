import { useEffect, useState } from 'react';
import Head from 'next/head';
import AdminLayout from '../../../components/admin/universal/AdminLayout';

import { withAuth } from '../../../lib/withAuth';
export default function NotificationsPage() {
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/notifications');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setList(data.data || []);

        // Restore read state from localStorage
        const readIds = JSON.parse(localStorage.getItem('admin.readNotifications') || '[]');
        if (Array.isArray(readIds) && readIds.length) {
          setList(prev => prev.map(n => readIds.includes(n.id) ? { ...n, unread: false } : { ...n, unread: true }));
        } else {
          setList(prev => prev.map(n => ({ ...n, unread: true })));
        }
        setSelected((data.data || [])[0] || null);
      } catch (_) {} finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const markRead = (id) => {
    setList(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
    const readIds = new Set(JSON.parse(localStorage.getItem('admin.readNotifications') || '[]'));
    readIds.add(id);
    localStorage.setItem('admin.readNotifications', JSON.stringify([...readIds]));
  };

  return (
    <>
      <Head>
        <title>Notifications - Admin</title>
      </Head>
      <AdminLayout currentPage="Notifications" fullWidth>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left list */}
            <div className="lg:col-span-1 rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-violet-200 dark:border-slate-700 shadow-lg">
              <div className="px-4 py-3 border-b border-violet-100 dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notifications</h2>
                <button
                  className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                  onClick={() => {
                    setList(prev => prev.map(n => ({ ...n, unread: false })));
                    localStorage.setItem('admin.readNotifications', JSON.stringify(list.map(n => n.id)));
                  }}
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-[70vh] overflow-auto divide-y divide-violet-50 dark:divide-slate-700">
                {loading && <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Loading...</div>}
                {!loading && list.length === 0 && <div className="p-6 text-sm text-slate-500 dark:text-slate-400">No notifications</div>}
                {list.map(n => (
                  <button
                    key={n.id}
                    onClick={() => { setSelected(n); markRead(n.id); }}
                    className={`w-full text-left px-4 py-3 hover:bg-violet-50/60 dark:hover:bg-slate-700/60 transition-colors ${
                      selected?.id === n.id ? 'bg-violet-50/80 dark:bg-slate-700/80' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                        n.unread ? 'bg-violet-600 dark:bg-violet-400' : 'bg-slate-300 dark:bg-slate-600'
                      }`}></span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{n.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{new Date(n.time).toLocaleString()}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right details */}
            <div className="lg:col-span-2 rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-violet-200 dark:border-slate-700 shadow-lg p-6">
              {selected ? (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{selected.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{new Date(selected.time).toLocaleString()}</p>
                  <div className="mt-4 text-slate-800 dark:text-slate-200">
                    <p className="text-sm whitespace-pre-line">{selected.body || 'No additional details.'}</p>
                  </div>
                  {selected.conversationId && (
                    <div className="pt-4">
                      <a 
                        href={`/admin/tickets/${selected.conversationId}`} 
                        className="inline-flex items-center text-sm text-violet-700 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 underline transition-colors"
                      >
                        Open related ticket
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">Select a notification to view details.</div>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

export const getServerSideProps = withAuth();



