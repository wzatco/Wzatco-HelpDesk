// Profile Management - View and edit customer profile
'use client';

import { useState } from 'react';
import { User, Mail, Save } from 'lucide-react';

export default function ProfileManagement({ userInfo, onBack, onLogout }) {
  const [profile, setProfile] = useState({
    name: userInfo.name,
    email: userInfo.email,
    phone: '',
    company: '',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // TODO: Save to API
    // await fetch('/api/widget/profile', { method: 'PUT', body: JSON.stringify(profile) });
    
    // Update localStorage
    const user = { ...userInfo, ...profile };
    localStorage.setItem('widget-user', JSON.stringify(user));
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-white text-lg font-bold mb-6">Profile Settings</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Phone (Optional)</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="+91 1234567890"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Company (Optional)</label>
            <input
              type="text"
              value={profile.company}
              onChange={(e) => setProfile({ ...profile, company: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="Company name"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{saved ? 'Saved!' : 'Save Changes'}</span>
          </button>

          {saved && (
            <div className="bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg text-sm text-center">
              Profile updated successfully!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

