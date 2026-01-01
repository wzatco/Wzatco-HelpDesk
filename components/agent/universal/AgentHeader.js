import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Menu, Search, Bell, SunMedium, Moon, ChevronDown, HelpCircle } from 'lucide-react';
import { useSettings } from '../../../hooks/useSettings';
import { useAgentAuth } from '../../../contexts/AgentAuthContext';
import { useAgentGlobal } from '../../../contexts/AgentGlobalData';
import { agentFetch } from '../../../lib/utils/agent-fetch';
import LeaveStatusModal from '../LeaveStatusModal';

export default function AgentHeader({ onMenuClick, currentPage }) {
  const router = useRouter();
  const { settings } = useSettings();
  const { logout, user } = useAgentAuth();
  const { notifications: globalNotifications, refreshGlobalData } = useAgentGlobal(); // Use centralized notifications
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [agentName, setAgentName] = useState('Agent');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [leaveStatus, setLeaveStatus] = useState('ACTIVE');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);

  // Format notifications for display
  const notifications = globalNotifications.map(n => {
    const date = new Date(n.time);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let timeString = '';
    if (diffMins < 1) {
      timeString = 'Just now';
    } else if (diffMins < 60) {
      timeString = `${diffMins}m ago`;
    } else if (diffHours < 24) {
      timeString = `${diffHours}h ago`;
    } else if (diffDays < 7) {
      timeString = `${diffDays}d ago`;
    } else {
      timeString = date.toLocaleDateString();
    }

    return {
      ...n,
      timeString,
      unread: !n.read
    };
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Initialize theme: localStorage first, then prefers-color-scheme
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
      const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const enableDark = stored ? stored === 'dark' : prefersDark;
      setIsDark(enableDark);
      if (enableDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (_) { }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
    if (typeof document !== 'undefined') {
      const next = !isDark;
      document.documentElement.classList.toggle('dark');
      try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch (_) { }
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Redirect to search page (to be created)
    router.push(`/agent/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const loadAgent = async () => {
    try {
      const res = await agentFetch('/api/agent/profile');
      if (!res.ok) return;
      const data = await res.json();
      setAgentName(data?.data?.name || 'Agent');
      setAvatarUrl(data?.data?.avatarUrl || '');
    } catch (_) { }
  };

  const loadLeaveStatus = async () => {
    try {
      const res = await agentFetch('/api/agent/leave-status');
      if (res.ok) {
        const data = await res.json();
        setLeaveStatus(data.status || 'ACTIVE');
      }
    } catch (_) { }
  };

  useEffect(() => {
    if (user) {
      setAgentName(user.name || 'Agent');
      setAvatarUrl(user.avatarUrl || '');
    }
    loadAgent();
    loadLeaveStatus();

    // Listen for profile updates
    const handleProfileUpdate = (event) => {
      const updatedProfile = event.detail;
      if (updatedProfile) {
        setAgentName(updatedProfile.name || 'Agent');
        setAvatarUrl(updatedProfile.avatarUrl || '');
      }
    };

    // Listen for leave status updates
    const handleLeaveStatusUpdate = () => {
      loadLeaveStatus();
    };

    window.addEventListener('agentProfileUpdated', handleProfileUpdate);
    window.addEventListener('leaveStatusUpdated', handleLeaveStatusUpdate);
    return () => {
      window.removeEventListener('agentProfileUpdated', handleProfileUpdate);
      window.removeEventListener('leaveStatusUpdated', handleLeaveStatusUpdate);
    };
  }, [user]);

  return (
    <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-violet-600 via-violet-700 to-purple-800 dark:from-slate-900 dark:via-violet-950 dark:to-slate-900 text-white shadow-lg">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="h-20 flex items-center justify-between">
          {/* Left: Menu + Logo */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/agent" className="flex items-center min-w-0">
              <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/70 ring-1 ring-white/40 shadow-md flex items-center justify-center dark:bg-white/5 dark:border-white/20 dark:ring-white/10">
                <span className="text-white font-extrabold text-lg leading-none">
                  {settings.appTitle ? settings.appTitle.charAt(0).toUpperCase() : 'W'}
                </span>
              </div>
              <span className="ml-2 text-white font-extrabold tracking-tight text-lg select-none truncate">
                {settings.appTitle || 'Wzatco'} Agent
              </span>
            </Link>
          </div>

          {/* Center: Search */}
          <div className="flex-1 mx-6 hidden md:block max-w-3xl lg:max-w-4xl xl:max-w-5xl">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/80" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tickets, customers, articles..."
                className="w-full pl-12 pr-5 h-12 rounded-full bg-white/5 border border-white/70 ring-1 ring-white/40 text-white placeholder:text-white/80 focus:outline-none focus:ring-2 focus:ring-white/70 focus:border-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.12)] dark:bg-white/5 dark:border-white/20 dark:ring-white/10 dark:focus:ring-white/30 dark:focus:border-white/30"
              />
            </form>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Mobile menu */}
            <button
              type="button"
              aria-label="Open sidebar"
              onClick={onMenuClick}
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-full bg-transparent text-white hover:bg-white/10 border border-white/70 ring-1 ring-white/40 shadow-md dark:border-white/20 dark:ring-white/10"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              type="button"
              aria-label="Help"
              onClick={() => router.push('/agent/knowledge-base')}
              className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-transparent text-white hover:bg-white/10 border border-white/70 ring-1 ring-white/40 shadow-md dark:border-white/20 dark:ring-white/10"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            <div ref={notificationsRef} className="relative">
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => setNotificationsOpen((v) => !v)}
                className="relative inline-flex items-center justify-center w-11 h-11 rounded-full bg-transparent text-white hover:bg-white/10 border border-white/70 ring-1 ring-white/40 shadow-md dark:border-white/20 dark:ring-white/10"
              >
                <Bell className="w-5 h-5" />
                {notifications.some(n => n.unread) && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] leading-4 rounded-full text-center shadow ring-2 ring-white">
                    {notifications.filter(n => n.unread).length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white/95 backdrop-blur border border-violet-200 shadow-2xl p-2 text-slate-800 dark:bg-slate-900/95 dark:border-slate-700 dark:text-slate-100">
                  <div className="px-3 py-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">Notifications</p>
                    {notifications.some(n => n.unread) && (
                      <button
                        className="text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                        onClick={async () => {
                          try {
                            await Promise.all(
                              notifications
                                .filter(n => n.unread)
                                .map(n =>
                                  fetch(`/api/agent/notifications/${n.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ read: true })
                                  })
                                )
                            );
                            // Refresh global data to update notification bell
                            refreshGlobalData();
                          } catch (error) {
                            console.error('Error marking all notifications as read:', error);
                          }
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="my-1 h-px bg-violet-100"></div>
                  <div className="max-h-80 overflow-auto">
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-2 px-3 py-2 rounded-xl hover:bg-violet-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${n.unread ? 'bg-violet-50/50 dark:bg-slate-800/60' : ''}`}
                        onClick={async () => {
                          if (n.unread) {
                            try {
                              await fetch(`/api/agent/notifications/${n.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ read: true })
                              });
                              // Refresh global data to update notification bell
                              refreshGlobalData();
                            } catch (error) {
                              console.error('Error marking notification as read:', error);
                            }
                          }
                          setNotificationsOpen(false);
                          // For transfer notifications, always go to notifications page
                          if (n.type === 'ticket_transfer') {
                            router.push('/agent/notifications');
                          } else if (n.link) {
                            router.push(n.link);
                          }
                        }}
                      >
                        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.unread ? 'bg-violet-600 dark:bg-violet-400' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{n.title}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{n.timeString}</p>
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="px-3 py-6 text-center text-sm text-slate-500">No notifications</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              aria-label="Toggle theme"
              onClick={toggleTheme}
              className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-transparent text-white hover:bg-white/10 border border-white/70 ring-1 ring-white/40 shadow-md"
            >
              {isDark ? <SunMedium className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Status Badge */}
            <button
              type="button"
              onClick={() => setShowLeaveModal(true)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                leaveStatus === 'ON_LEAVE'
                  ? 'bg-red-500/20 border-red-500/50 text-red-100 hover:bg-red-500/30'
                  : 'bg-green-500/20 border-green-500/50 text-green-100 hover:bg-green-500/30'
              }`}
              title={leaveStatus === 'ON_LEAVE' ? 'On Leave - Click to change' : 'Active - Click to change'}
            >
              <div className={`w-2 h-2 rounded-full ${leaveStatus === 'ON_LEAVE' ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <span className="hidden sm:inline">{leaveStatus === 'ON_LEAVE' ? 'On Leave' : 'Active'}</span>
            </button>

            {/* Profile */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen(v => !v)}
                className="inline-flex items-center h-11 pl-1.5 pr-3 rounded-full bg-transparent text-white hover:bg-white/10 border border-white/70 ring-1 ring-white/40 shadow-md gap-2"
              >
                <div className="w-7 h-7 rounded-xl overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow">
                  {avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim() ? (
                    <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <span className="text-xs font-semibold">{agentName ? agentName[0].toUpperCase() : 'A'}</span>
                  )}
                </div>
                <span className="hidden md:inline text-sm font-medium">{agentName}</span>
                <ChevronDown className={`w-4 h-4 text-white/90 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-violet-200 shadow-2xl p-2 text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.name || agentName || 'Agent'}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{user?.email || 'agent@wzatco.com'}</p>
                  </div>
                  <div className="my-1 h-px bg-violet-100 dark:bg-slate-700"></div>
                  <Link href="/agent/profile" className="block px-3 py-2 text-sm rounded-xl hover:bg-violet-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200" onClick={() => setProfileOpen(false)}>Profile</Link>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      setShowLeaveModal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-violet-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    Change Status
                  </button>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search row */}
        <div className="pb-3 md:hidden">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/80" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets, customers, articles..."
              className="w-full pl-12 pr-5 h-12 rounded-full bg-white/5 border border-white/70 ring-1 ring-white/40 text-white placeholder:text-white/80 focus:outline-none focus:ring-2 focus:ring-white/70 focus:border-white/80 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
            />
          </form>
        </div>
      </div>

      {/* Leave Status Modal */}
      <LeaveStatusModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onStatusChange={(data) => {
          setLeaveStatus(data.status);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('leaveStatusUpdated'));
          }
        }}
      />
    </header>
  );
}

