// Main Menu - Shows 5 support options
'use client';

import { 
  GraduationCap, 
  MessageCircle, 
  Rocket, 
  Phone, 
  ClipboardList,
  User,
  LogOut
} from 'lucide-react';
import { useState } from 'react';

export default function MainMenu({ userInfo, onViewChange, onLogout }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const supportOptions = [
    {
      id: 'kb',
      title: 'Knowledge Base',
      description: 'Search guides & FAQs',
      icon: GraduationCap,
      color: 'from-blue-600 via-blue-700 to-cyan-800',
    },
    {
      id: 'tutorials',
      title: 'Projector Tutorials & Guides',
      description: 'Setup videos, manuals & troubleshooting',
      icon: Rocket,
      color: 'from-purple-600 via-violet-700 to-fuchsia-800',
    },
    {
      id: 'call-schedule',
      title: 'Schedule Call Back',
      description: 'Book a callback at your convenience',
      icon: Phone,
      color: 'from-orange-600 via-red-700 to-pink-800',
    },
    {
      id: 'tickets',
      title: 'Ticket Management',
      description: 'View and manage your support tickets',
      icon: ClipboardList,
      color: 'from-red-600 via-rose-700 to-pink-800',
    },
  ];

  const getUserInitials = () => {
    if (userInfo.name) {
      return userInfo.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (userInfo.email) {
      return userInfo.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div
        className="bg-gradient-to-r from-purple-700 via-pink-600 to-red-600 text-white px-3 py-2.5"
        style={{
          background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 50%, #EF4444 100%)',
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white tracking-tight">WZATCO Support</h2>
          
          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center p-1 hover:bg-white/20 rounded transition-all"
            >
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-white text-[10px] font-semibold">{getUserInitials()}</span>
              </div>
            </button>

            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onViewChange('profile');
                    }}
                    className="w-full px-3 py-2 text-left text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 rounded-t-lg text-xs transition-colors"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full px-3 py-2 text-left text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 rounded-b-lg text-xs transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Support Options Header */}
      <div
        className="bg-gradient-to-r from-purple-700 via-pink-600 to-red-600 text-white px-3 py-2 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 50%, #EF4444 100%)',
        }}
      >
        <h3 className="text-sm font-semibold text-white">Support Options</h3>
      </div>

      {/* Options Grid */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 sm:space-y-3 bg-white dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
          {supportOptions.map((option, index) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => onViewChange(option.id)}
                className="group relative p-2.5 sm:p-3 rounded-lg overflow-hidden transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-left"
              >
                {/* Content */}
                <div className="relative flex items-center space-x-2 sm:space-x-3 z-10">
                  {/* Icon */}
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${option.color} flex items-center justify-center text-white shadow-lg dark:shadow-purple-500/20 transform transition-all duration-200 group-hover:scale-105 relative overflow-hidden flex-shrink-0`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 relative z-10 drop-shadow-sm" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 text-left min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-xs mb-0.5 truncate">
                      {option.title}
                    </h3>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-tight line-clamp-1">
                      {option.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <svg
                    className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-pink-400 transform transition-all duration-200 group-hover:translate-x-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Message */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Need more help? Our support team is here for you.
          </p>
        </div>
      </div>
    </div>
  );
}

