import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import AdminLayout from '../../../components/admin/universal/AdminLayout';
import { User, Mail, Phone, Briefcase, MapPin, Calendar, Globe, Bell, CheckCircle, XCircle, Image as ImageIcon, Upload, Lock, Eye, EyeOff } from 'lucide-react';

export default function AdminProfilePage() {
  const [profile, setProfile] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    role: 'Admin', 
    bio: '', 
    address: '', 
    city: '', 
    state: '', 
    country: '', 
    postal: '', 
    timezone: 'Asia/Kolkata', 
    notifyEmail: true, 
    notifyPush: true, 
    avatarUrl: '' 
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadPreview, setUploadPreview] = useState('');
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ type: null, message: '' });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const fileRef = useRef(null);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/profile');
      const json = await res.json();
      const d = json?.data || {};
      setProfile({
        name: d.name || 'Admin',
        email: d.email || 'admin@wzatco.com',
        phone: d.phone || '',
        role: d.role || 'Admin',
        bio: d.bio || '',
        address: d.address || '',
        city: d.city || '',
        state: d.state || '',
        country: d.country || '',
        postal: d.postal || '',
        timezone: d.timezone || 'Asia/Kolkata',
        notifyEmail: d.notifyEmail ?? true,
        notifyPush: d.notifyPush ?? true,
        avatarUrl: d.avatarUrl || ''
      });
      setAvatarRemoved(false);
    } catch (err) {
      setSaveStatus({ type: 'error', message: 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const save = async () => {
    setSaving(true);
    setSaveStatus({ type: null, message: '' });
    try {
      let avatarBase64;
      // If there's a new upload, use it
      if (uploadPreview) {
        avatarBase64 = uploadPreview;
        console.log('Saving with avatar, preview length:', uploadPreview.length);
      } 
      // If user explicitly removed avatar, send null
      else if (avatarRemoved) {
        avatarBase64 = null;
        console.log('Removing avatar');
      }
      // Otherwise don't send avatarBase64 (keep existing)
      
      const payload = { ...profile };
      if (avatarBase64 !== undefined) {
        payload.avatarBase64 = avatarBase64;
      }
      
      // Include password fields if provided
      if (passwordData.newPassword) {
        payload.currentPassword = passwordData.currentPassword;
        payload.newPassword = passwordData.newPassword;
        payload.confirmPassword = passwordData.confirmPassword;
      }
      
      const payloadSize = JSON.stringify(payload).length;
      console.log('Payload size:', payloadSize, 'bytes', '(avatarBase64:', avatarBase64 ? `${avatarBase64.length} chars` : 'not included', ')');
      
      // If payload is too large (> 8MB), show error
      if (payloadSize > 8 * 1024 * 1024) {
        throw new Error('Image is too large. Please compress the image or use a smaller file.');
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      try {
        const res = await fetch('/api/admin/profile', {
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
          throw new Error(errorData.message || `Server error: ${res.status}`);
        }
        
        const json = await res.json();
        setProfile(prev => ({ ...prev, avatarUrl: json.data?.avatarUrl || '' }));
        setUploadPreview('');
        setAvatarRemoved(false);
        
        // Clear password fields if password was changed
        if (passwordData.newPassword) {
          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        }
        
        setSaveStatus({ type: 'success', message: passwordData.newPassword ? 'Profile and password updated successfully!' : 'Profile saved successfully!' });
        
        // Dispatch custom event to refresh header and sidebar
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('adminProfileUpdated', { detail: json.data }));
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => setSaveStatus({ type: null, message: '' }), 3000);
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
      setSaveStatus({ type: 'error', message: errorMessage });
      console.error('Profile save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setSaveStatus({ type: 'error', message: 'Image size must be less than 5MB' });
      return;
    }
    setAvatarRemoved(false); // Clear removal flag when uploading new image
    const reader = new FileReader();
    reader.onload = () => setUploadPreview(reader.result.toString());
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setUploadPreview('');
    setAvatarRemoved(true);
    setProfile(prev => ({ ...prev, avatarUrl: '' }));
  };

  if (loading) {
    return (
      <AdminLayout currentPage="Profile">
        <div className="flex items-center justify-center h-screen">
          <div className="text-slate-600 dark:text-slate-400">Loading profile...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Profile Settings - Admin</title>
      </Head>
      <AdminLayout currentPage="Profile">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Profile Settings</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your account information and preferences</p>
              </div>
            </div>

            {/* Status Message */}
            {saveStatus.type && (
              <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
                saveStatus.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' 
                  : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
              }`}>
                {saveStatus.type === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <span>{saveStatus.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Profile Image & Basic Info */}
              <div className="lg:col-span-1 space-y-6">
                {/* Profile Image Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-violet-600" />
                    Profile Picture
                  </h2>
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-700">
                        {(uploadPreview && typeof uploadPreview === 'string' && uploadPreview.trim()) || (profile.avatarUrl && typeof profile.avatarUrl === 'string' && profile.avatarUrl.trim()) ? (
                          <img 
                            src={uploadPreview || profile.avatarUrl} 
                            alt="Avatar" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <span className="text-4xl font-bold text-white">
                            {(profile.name || 'A').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                      <button 
                        onClick={() => fileRef.current?.click()} 
                        type="button" 
                        className="w-full inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium shadow hover:shadow-lg transition-all border border-violet-500/30"
                      >
                        <Upload className="w-4 h-4" />
                        {uploadPreview || profile.avatarUrl ? 'Change Photo' : 'Upload Photo'}
                      </button>
                      {(uploadPreview || profile.avatarUrl) && (
                        <button 
                          onClick={removeAvatar} 
                          type="button" 
                          className="w-full h-11 px-4 rounded-xl border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                      JPG, PNG or GIF. Max size 5MB
                    </p>
                  </div>
                </div>

                {/* Quick Stats Card */}
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 rounded-2xl border border-violet-200 dark:border-slate-700 p-6">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Account Info</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center">
                        <User className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Role</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{profile.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{profile.email}</p>
                      </div>
                    </div>
                    {(profile.city || profile.country) && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Location</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {[profile.city, profile.country].filter(Boolean).join(', ') || 'Not set'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Form Fields */}
              <div className="lg:col-span-2 space-y-6">
                {/* Personal Information */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-violet-600" />
                    Personal Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Full Name
                      </label>
                      <input 
                        type="text"
                        value={profile.name} 
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })} 
                        className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" 
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Email Address
                      </label>
                      <input 
                        type="email"
                        value={profile.email} 
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })} 
                        className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" 
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phone Number
                      </label>
                      <input 
                        type="tel"
                        value={profile.phone} 
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })} 
                        className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" 
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Role
                      </label>
                      <input 
                        type="text"
                        value={profile.role} 
                        onChange={(e) => setProfile({ ...profile, role: e.target.value })} 
                        className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" 
                        placeholder="Your role"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Bio
                      </label>
                      <textarea 
                        value={profile.bio} 
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })} 
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none" 
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-violet-600" />
                    Address Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Street Address
                      </label>
                      <input 
                        type="text"
                        value={profile.address} 
                        onChange={(e) => setProfile({ ...profile, address: e.target.value })} 
                        className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" 
                        placeholder="123 Main Street"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        City
                      </label>
                      <input 
                        type="text"
                        value={profile.city} 
                        onChange={(e) => setProfile({ ...profile, city: e.target.value })} 
                        className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" 
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        State/Province
                      </label>
                      <input 
                        type="text"
                        value={profile.state} 
                        onChange={(e) => setProfile({ ...profile, state: e.target.value })} 
                        className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" 
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Country
                      </label>
                      <input 
                        type="text"
                        value={profile.country} 
                        onChange={(e) => setProfile({ ...profile, country: e.target.value })} 
                        className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" 
                        placeholder="Country"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Postal Code
                      </label>
                      <input 
                        type="text"
                        value={profile.postal} 
                        onChange={(e) => setProfile({ ...profile, postal: e.target.value })} 
                        className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" 
                        placeholder="12345"
                      />
                    </div>
                  </div>
                </div>

                {/* Change Password */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-violet-600" />
                    Change Password
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input 
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordData.currentPassword} 
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} 
                          className="w-full h-11 px-4 pr-10 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" 
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input 
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordData.newPassword} 
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} 
                          className="w-full h-11 px-4 pr-10 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" 
                          placeholder="Enter new password (min 6 characters)"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input 
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordData.confirmPassword} 
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} 
                          className="w-full h-11 px-4 pr-10 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" 
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">Passwords do not match</p>
                      )}
                    </div>
                    {passwordData.newPassword && passwordData.newPassword.length > 0 && passwordData.newPassword.length < 6 && (
                      <p className="text-xs text-red-600 dark:text-red-400">Password must be at least 6 characters long</p>
                    )}
                  </div>
                </div>

                {/* Preferences */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-200 dark:border-slate-700 shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-violet-600" />
                    Preferences
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Timezone
                      </label>
                      <input 
                        type="text"
                        value={profile.timezone} 
                        onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} 
                        className="w-full h-11 px-4 rounded-xl border border-violet-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" 
                        placeholder="Asia/Kolkata"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Notifications
                      </label>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 rounded-xl border border-violet-200 dark:border-slate-700 hover:bg-violet-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={profile.notifyEmail} 
                            onChange={(e) => setProfile({ ...profile, notifyEmail: e.target.checked })} 
                            className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">Email Notifications</span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Receive updates via email</p>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-xl border border-violet-200 dark:border-slate-700 hover:bg-violet-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={profile.notifyPush} 
                            onChange={(e) => setProfile({ ...profile, notifyPush: e.target.checked })} 
                            className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">Push Notifications</span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Receive browser push notifications</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-end gap-4 pt-4">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all border border-violet-500/30"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
