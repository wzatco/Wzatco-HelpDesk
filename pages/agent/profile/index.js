import { useEffect, useState } from 'react';
import Head from 'next/head';
import AgentLayout from '../../../components/agent/universal/AgentLayout';
import ProfileView from '../../../components/universal/ProfileView';
import ProfileOverview from '../../../components/universal/ProfileOverview';
import { Edit2 } from 'lucide-react';

export default function AgentProfilePage() {
  const [profile, setProfile] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agent/profile');
      const json = await res.json();
      if (json.success && json.data) {
        setProfile({
          id: json.data.id,
          name: json.data.name || 'Agent',
          email: json.data.email || '',
          phone: json.data.phone || '',
          slug: json.data.slug,
          avatarUrl: json.data.avatarUrl || '',
          department: json.data.department,
          role: json.data.role,
          isActive: json.data.isActive,
          presenceStatus: json.data.presenceStatus,
          lastSeenAt: json.data.lastSeenAt,
          // New profile fields
          bio: json.data.bio || '',
          jobTitle: json.data.jobTitle || '',
          mobile: json.data.mobile || '',
          extension: json.data.extension || '',
          address: json.data.address || '',
          city: json.data.city || '',
          state: json.data.state || '',
          country: json.data.country || '',
          postal: json.data.postal || '',
          timezone: json.data.timezone || 'Asia/Kolkata',
          language: json.data.language || 'en',
          skills: json.data.skills 
            ? (typeof json.data.skills === 'string' && json.data.skills.startsWith('[') 
                ? JSON.parse(json.data.skills) 
                : (typeof json.data.skills === 'string' 
                    ? json.data.skills.split(',').map(s => s.trim()).filter(Boolean)
                    : Array.isArray(json.data.skills) ? json.data.skills : []))
            : [],
          maxLoad: json.data.maxLoad || null
        });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await fetch('/api/agent/departments');
      const json = await res.json();
      if (json.departments) {
        setDepartments(json.departments);
      }
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const loadStats = async (days = 7) => {
    setStatsLoading(true);
    setTicketsLoading(true);
    try {
      const res = await fetch(`/api/agent/profile/stats?days=${days}`);
      const json = await res.json();
      if (json.success) {
        if (json.stats) {
          setStats(json.stats);
        }
        if (json.tickets) {
          setTickets(json.tickets);
        }
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setStatsLoading(false);
      setTicketsLoading(false);
    }
  };

  const handleTimeRangeChange = (days) => {
    loadStats(days);
  };

  useEffect(() => {
    loadProfile();
    loadDepartments();
    loadStats(7);
  }, []);

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      const payloadSize = JSON.stringify(payload).length;
      if (payloadSize > 8 * 1024 * 1024) {
        throw new Error('Image is too large. Please compress the image or use a smaller file.');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const res = await fetch('/api/agent/profile', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
      
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || errorData.error || `Server error: ${res.status}`);
        }
        
        const json = await res.json();
        if (json.success && json.data) {
          setProfile(prev => ({ 
            ...prev, 
            ...json.data,
            avatarUrl: json.data?.avatarUrl || prev?.avatarUrl || ''
          }));
          
          // Dispatch custom event to refresh header and sidebar
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('agentProfileUpdated', { detail: json.data }));
          }
        }
        
        return { success: true, data: json.data };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (err) {
      let errorMessage = 'Failed to save profile. Please try again.';
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again with a smaller image.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      return { success: false, error: errorMessage };
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head>
        <title>Profile - Agent</title>
      </Head>
      <AgentLayout currentPage="Profile">
        <div className="h-[calc(100vh-64px)] overflow-hidden">
          {isEditing ? (
            <div className="p-4 sm:p-6 lg:p-8 h-full overflow-y-auto">
              <div className="max-w-6xl mx-auto">
                {profile && (
                  <ProfileView
                    data={profile}
                    onSave={handleSave}
                    isAgent={true}
                    loading={loading}
                    saving={saving}
                    departments={departments}
                    onCancel={() => setIsEditing(false)}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Header with Edit Button */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                    My Information
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    View and manage your profile information
                  </p>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              </div>
              
              {/* Profile Overview */}
              <div className="flex-1 overflow-hidden">
                {profile && (
                  <ProfileOverview
                    profile={profile}
                    isAgent={true}
                    stats={stats}
                    tickets={tickets}
                    loading={statsLoading}
                    ticketsLoading={ticketsLoading}
                    onEdit={() => setIsEditing(true)}
                    onTimeRangeChange={handleTimeRangeChange}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </AgentLayout>
    </>
  );
}

