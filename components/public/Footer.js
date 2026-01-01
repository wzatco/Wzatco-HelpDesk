// Public Knowledge Base Footer
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Mail, Phone } from 'lucide-react';

export default function Footer() {
  const [footerSettings, setFooterSettings] = useState({
    description: 'Your comprehensive resource for projector setup, troubleshooting, and support.',
    quickLinks: [
      { label: 'Home', url: '/' },
      { label: 'All Articles', url: '/' }
    ],
    supportEmail: 'support@wzatco.com',
    supportPhone: '+91 XXX XXX XXXX',
    copyrightText: `© ${new Date().getFullYear()} WZATCO. All rights reserved.`
  });

  useEffect(() => {
    // Fetch footer settings from API
    const fetchFooterSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings/basic');
        const data = await response.json();
        if (data.success && data.settings.footerSettings) {
          setFooterSettings(prev => ({
            ...prev,
            ...data.settings.footerSettings
          }));
        }
      } catch (error) {
        console.error('Error fetching footer settings:', error);
      }
    };
    fetchFooterSettings();
  }, []);

  return (
    <footer className="bg-gradient-to-r from-violet-50 via-purple-50 to-violet-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 border-t border-violet-200 dark:border-slate-800 mt-auto">
      <div className="max-w-none mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">WZATCO</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">Knowledge Base</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
              {footerSettings.description}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-slate-900 dark:text-white font-semibold mb-2 text-sm">Quick Links</h4>
            <ul className="space-y-1">
              {footerSettings.quickLinks.map((link, index) => (
                <li key={index}>
                  <Link href={link.url} className="text-xs text-slate-600 dark:text-slate-400 hover:text-violet-700 dark:hover:text-violet-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-slate-900 dark:text-white font-semibold mb-2 text-sm">Support</h4>
            <ul className="space-y-1">
              <li className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
                <Mail className="w-3 h-3" />
                <a href={`mailto:${footerSettings.supportEmail}`} className="hover:text-violet-700 dark:hover:text-violet-400 transition-colors">
                  {footerSettings.supportEmail}
                </a>
              </li>
              <li className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
                <Phone className="w-3 h-3" />
                <span>{footerSettings.supportPhone}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-violet-200 dark:border-slate-800 mt-4 pt-4 text-center text-xs text-slate-600 dark:text-slate-400">
          <p>{footerSettings.copyrightText}</p>
        </div>
      </div>
    </footer>
  );
}

