// Widget Menu - Main options overlay
'use client';

import { useState } from 'react';
import { 
  BookOpen, 
  GraduationCap, 
  Phone, 
  Ticket, 
  ChevronRight,
  X 
} from 'lucide-react';

export default function WidgetMenu({ isOpen, onClose, onSelectOption, userInfo }) {
  const menuOptions = [
    {
      id: 'knowledge-base',
      title: 'Knowledge Base',
      description: 'Search guides & FAQs',
      icon: BookOpen,
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      color: 'blue'
    },
    {
      id: 'tutorials',
      title: 'Projector Tutorials & Guides',
      description: 'Setup videos, manuals & troubleshooting',
      icon: GraduationCap,
      iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
      color: 'purple'
    },
    {
      id: 'schedule-callback',
      title: 'Schedule Call Back',
      description: 'Book a callback at your convenience',
      icon: Phone,
      iconBg: 'bg-gradient-to-br from-orange-500 to-red-500',
      color: 'orange'
    },
    {
      id: 'tickets',
      title: 'Ticket Management',
      description: 'View and manage your support tickets',
      icon: Ticket,
      iconBg: 'bg-gradient-to-br from-red-500 to-red-600',
      color: 'red'
    }
  ];

  return (
    <div className={`absolute inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col transition-all duration-300 ease-out ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-red-600 text-white px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Support Options</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded transition-all duration-200"
          title="Close Menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-gray-900">
        {menuOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              onClick={() => onSelectOption(option.id)}
              className="w-full p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 flex items-center space-x-4 group hover:shadow-md dark:hover:shadow-purple-500/20 border border-gray-200 dark:border-gray-700"
            >
              {/* Icon */}
              <div className={`${option.iconBg} w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg dark:shadow-purple-500/20`}>
                <Icon className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 text-left min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  {option.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {option.description}
                </p>
              </div>

              {/* Chevron */}
              <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-pink-400 transition-colors flex-shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Need more help? Our support team is here for you.
        </p>
      </div>
    </div>
  );
}

