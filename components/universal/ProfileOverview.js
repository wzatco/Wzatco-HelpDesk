import { useState } from 'react';
import { 
  Mail, Phone, MapPin, Globe, 
  Plus, Smartphone
} from 'lucide-react';
import OverviewTab from './profile/tabs/OverviewTab';
import TicketsTab from './profile/tabs/TicketsTab';

export default function ProfileOverview({ 
  profile, 
  isAgent = false,
  onEdit,
  stats = null,
  tickets = [],
  loading = false,
  ticketsLoading = false,
  onTimeRangeChange
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('7');

  const handleTimeRangeChange = (value) => {
    setTimeRange(value);
    if (onTimeRangeChange) {
      onTimeRangeChange(parseInt(value));
    }
  };

  const formatTime = (hours) => {
    if (!hours || hours === 0) return '00:00 hrs';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} hrs`;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getRoleDisplay = () => {
    if (isAgent) {
      return profile?.jobTitle 
        ? `${profile.jobTitle} - ${profile.role?.displayAs || profile.role?.title || 'Agent'}`
        : profile?.role?.displayAs || profile?.role?.title || 'Agent';
    }
    return 'Support Administrator';
  };

  const getDepartmentName = () => {
    if (isAgent && profile?.department) {
      return typeof profile.department === 'string' 
        ? profile.department 
        : profile.department.name || 'Unassigned';
    }
    return null;
  };

  return (
    <div className="flex h-full bg-white dark:bg-slate-900">
      {/* Left Sidebar */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
        {/* Profile Section */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-700 mb-4">
              {profile?.avatarUrl ? (
                <img 
                  src={profile.avatarUrl} 
                  alt={profile.name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {getInitials(profile?.name)}
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
              {profile?.name || 'User'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              {getRoleDisplay()}
            </p>
          </div>

          {/* Contact Info */}
          <div className="space-y-3">
            {profile?.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300">{profile.email}</span>
              </div>
            )}
            
            {profile?.phone ? (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300">{profile.phone}</span>
              </div>
            ) : (
              <button className="flex items-center gap-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                <Plus className="w-4 h-4" />
                <span>Add Phone</span>
              </button>
            )}

            {profile?.mobile ? (
              <div className="flex items-center gap-3 text-sm">
                <Smartphone className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300">{profile.mobile}</span>
              </div>
            ) : (
              <button className="flex items-center gap-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                <Plus className="w-4 h-4" />
                <span>Add Mobile</span>
              </button>
            )}
          </div>

          {/* Locale Info */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-3">
            {profile?.language && (
              <div className="flex items-center gap-3 text-sm">
                <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300">
                  {profile.language === 'en' ? 'English (United States)' : profile.language}
                </span>
              </div>
            )}
            
            {profile?.country && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300">{profile.country}</span>
              </div>
            )}
          </div>

          {/* Department Tag */}
          {isAgent && getDepartmentName() && (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm">
                {getDepartmentName()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between px-6">
            <div className="flex gap-1">
              {['overview', 'tickets'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            
            {/* Time Range Selector */}
            <div className="flex items-center gap-2">
              <select
                value={timeRange}
                onChange={(e) => handleTimeRangeChange(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
          {activeTab === 'overview' && (
            <OverviewTab 
              stats={stats} 
              loading={loading}
              formatTime={formatTime}
            />
          )}
          {activeTab === 'tickets' && (
            <TicketsTab 
              tickets={tickets}
              loading={ticketsLoading}
              isAgent={isAgent}
            />
          )}
        </div>
      </div>
    </div>
  );
}


