import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  User, Mail, Phone, MapPin, Globe, Briefcase, 
  Edit2, X, Check, Upload, Image as ImageIcon,
  Smartphone, FileText, Clock, ChevronRight,
  BookOpen, Info
} from 'lucide-react';
import StyledSelect from '../ui/StyledSelect';
import PhoneInput from '../ui/PhoneInput';
import TagsInput from '../ui/TagsInput';

export default function ProfileView({ 
  data, 
  isEditing: initialEditing = false, 
  onSave, 
  onCancel,
  isAgent = false,
  loading = false,
  saving = false,
  departments = []
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [formData, setFormData] = useState(data || {});
  const [uploadPreview, setUploadPreview] = useState('');
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ type: null, message: '' });
  const fileRef = useRef(null);

  // Update form data when data prop changes
  useEffect(() => {
    if (data) {
      setFormData(data);
      setUploadPreview('');
      setAvatarRemoved(false);
    }
  }, [data]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setSaveStatus({ type: 'error', message: 'Image size must be less than 2MB' });
      return;
    }
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setSaveStatus({ type: 'error', message: 'Please choose a JPG, PNG, GIF or JPEG file type' });
      return;
    }
    setAvatarRemoved(false);
    const reader = new FileReader();
    reader.onload = () => setUploadPreview(reader.result.toString());
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setUploadPreview('');
    setAvatarRemoved(true);
    setFormData(prev => ({ ...prev, avatarUrl: '' }));
  };

  const handleSave = async () => {
    setSaveStatus({ type: null, message: '' });
    
    let avatarBase64;
    if (uploadPreview) {
      avatarBase64 = uploadPreview;
    } else if (avatarRemoved) {
      avatarBase64 = null;
    }

    const payload = { ...formData };
    // Convert skills array to string if it's an array
    if (Array.isArray(payload.skills)) {
      payload.skills = JSON.stringify(payload.skills);
    }
    if (avatarBase64 !== undefined) {
      payload.avatarBase64 = avatarBase64;
    }

    try {
      const result = await onSave(payload);
      if (result?.success) {
        setIsEditing(false);
        setUploadPreview('');
        setAvatarRemoved(false);
        setSaveStatus({ type: 'success', message: 'Profile updated successfully!' });
        setTimeout(() => setSaveStatus({ type: null, message: '' }), 3000);
      } else {
        setSaveStatus({ type: 'error', message: result?.error || 'Failed to update profile' });
      }
    } catch (error) {
      setSaveStatus({ type: 'error', message: error.message || 'Failed to update profile' });
    }
  };

  const handleCancel = () => {
    setFormData(data || {});
    setUploadPreview('');
    setAvatarRemoved(false);
    setIsEditing(false);
    setSaveStatus({ type: null, message: '' });
    if (onCancel) onCancel();
  };

  // Split name into first and last name
  const nameParts = (formData.name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const displayName = formData.name || 'User';
  const displayRole = isAgent 
    ? (formData.role?.displayAs || formData.role?.title || formData.jobTitle || 'Agent')
    : (formData.role || 'Admin');
  const avatarUrl = uploadPreview || formData.avatarUrl;
  const avatarInitial = displayName.charAt(0).toUpperCase();

  // Parse skills from string to array for TagsInput
  const skillsArray = formData.skills 
    ? (typeof formData.skills === 'string' 
        ? (formData.skills.startsWith('[') ? JSON.parse(formData.skills) : formData.skills.split(',').map(s => s.trim()).filter(Boolean))
        : Array.isArray(formData.skills) ? formData.skills : [])
    : [];

  // Get base URL for Learn More link
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600 dark:text-slate-400">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <nav className="flex items-center space-x-2 text-sm">
          <Link href={isAgent ? '/agent' : '/admin'} className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
            {isAgent ? 'Agent' : 'Admin'}
          </Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-700 dark:text-slate-300">My Information</span>
        </nav>
        <div className="flex items-center gap-3">
          <button className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Info className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Status Message */}
      {saveStatus.type && (
        <div className={`flex items-center gap-3 p-4 rounded-lg border ${
          saveStatus.type === 'success' 
            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' 
            : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
        }`}>
          {saveStatus.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <X className="w-5 h-5" />
          )}
          <span>{saveStatus.message}</span>
        </div>
      )}

      {/* MY INFORMATION Card */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">MY INFORMATION</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
          Each {isAgent ? 'agent' : 'admin'} in the system will have a profile with some basic information about them. 
          You can enter information like the name, contact email, picture, bio, and the like. 
          The individual {isAgent ? 'agents' : 'admins'} or the administrator can set these up in your helpdesk.
        </p>
        <a 
          href={`${getBaseUrl()}/knowledge-base/profile-information`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1 w-fit"
        >
          <BookOpen className="w-4 h-4" />
          Learn More
        </a>
      </div>

      {/* Profile Picture Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md border-4 border-white dark:border-slate-700">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {avatarInitial}
                </span>
              )}
            </div>
            {isEditing && (
              <div className="absolute -bottom-2 -right-2">
                <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif" onChange={handleFileChange} className="hidden" />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-800"
                  title="Change photo"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{displayName}</h3>
            {isEditing ? (
              <div className="relative inline-block">
                <button 
                  onClick={() => fileRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  Upload
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Maximum file size 2MB, Please choose a JPG, PNG, GIF or JPEG file type.
            </p>
          </div>
        </div>
      </div>

      {/* Agent/Admin Information Card */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
          {isAgent ? 'Agent Information' : 'Admin Information'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              First Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={firstName}
                onChange={(e) => {
                  const newName = e.target.value + ' ' + lastName;
                  handleInputChange('name', newName.trim());
                }}
                className="w-full px-3 py-2 border-b-2 border-slate-300 dark:border-slate-600 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            ) : (
              <p className="text-sm text-slate-900 dark:text-white py-2">{firstName || 'Not set'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Last Name <span className="text-red-500">*</span>
            </label>
            {isEditing ? (
              <input
                type="text"
                value={lastName}
                onChange={(e) => {
                  const newName = firstName + ' ' + e.target.value;
                  handleInputChange('name', newName.trim());
                }}
                className="w-full px-3 py-2 border-b-2 border-slate-300 dark:border-slate-600 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                required
              />
            ) : (
              <p className="text-sm text-slate-900 dark:text-white py-2">{lastName || 'Not set'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            {isEditing ? (
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border-b-2 border-slate-300 dark:border-slate-600 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                required
              />
            ) : (
              <p className="text-sm text-slate-900 dark:text-white py-2">{formData.email || 'Not set'}</p>
            )}
          </div>
          {isAgent && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Status
              </label>
              {isEditing ? (
                <StyledSelect
                  value={formData.isActive ? 'Active' : 'Inactive'}
                  onChange={(val) => handleInputChange('isActive', val === 'Active')}
                  options={[
                    { value: 'Active', name: 'Active' },
                    { value: 'Inactive', name: 'Inactive' }
                  ]}
                  className="w-full"
                />
              ) : (
                <p className="text-sm text-slate-900 dark:text-white py-2">
                  {formData.isActive ? 'Active' : 'Inactive'}
                </p>
              )}
            </div>
          )}
          {isAgent && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Departments <span className="text-red-500">*</span>
              </label>
              {isEditing ? (
                <StyledSelect
                  value={formData.department?.id || formData.departmentId || ''}
                  onChange={(val) => {
                    const selectedDept = departments.find(d => d.id === val);
                    handleInputChange('departmentId', val);
                    if (selectedDept) {
                      handleInputChange('department', selectedDept);
                    }
                  }}
                  options={[
                    { value: '', name: '---Select---' },
                    ...departments.map(dept => ({ value: dept.id, name: dept.name }))
                  ]}
                  placeholder="---Select---"
                  required
                  className="w-full"
                />
              ) : (
                <p className="text-sm text-slate-900 dark:text-white py-2">
                  {formData.department?.name || 'Not set'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Role and Permission Card (Agent only) */}
      {isAgent && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Role and Permission <span className="text-red-500">*</span>
          </h2>
          <input
            type="text"
            value={displayRole}
            readOnly
            className="w-full px-3 py-2 border-b-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 cursor-not-allowed"
          />
        </div>
      )}

      {/* Additional Information Card */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
          {isAgent ? 'Agent Additional Information' : 'Additional Information'}
        </h2>
        <div className="space-y-6">
          {isAgent && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Channel Expert
              </label>
              {isEditing ? (
                <TagsInput
                  value={skillsArray}
                  onChange={(tags) => handleInputChange('skills', tags)}
                  placeholder="Enter channel (e.g., Email, Chat, Phone) and press Enter"
                  className="w-full"
                />
              ) : (
                <div className="py-2">
                  {skillsArray.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {skillsArray.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-900 dark:text-white">Not set</p>
                  )}
                </div>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              About
            </label>
            {isEditing ? (
              <textarea
                value={formData.bio || ''}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border-b-2 border-slate-300 dark:border-slate-600 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Tell us about yourself..."
              />
            ) : (
              <p className="text-sm text-slate-900 dark:text-white py-2 whitespace-pre-wrap">{formData.bio || 'Not set'}</p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Phone
              </label>
              {isEditing ? (
                <PhoneInput
                  value={formData.phone || ''}
                  onChange={(value) => handleInputChange('phone', value)}
                  placeholder="Phone number"
                  className="w-full"
                />
              ) : (
                <p className="text-sm text-slate-900 dark:text-white py-2">{formData.phone || 'Not set'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Mobile
              </label>
              {isEditing ? (
                <PhoneInput
                  value={formData.mobile || ''}
                  onChange={(value) => handleInputChange('mobile', value)}
                  placeholder="Mobile number"
                  className="w-full"
                />
              ) : (
                <p className="text-sm text-slate-900 dark:text-white py-2">{formData.mobile || 'Not set'}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex items-center justify-start gap-4 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Updating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Update
              </>
            )}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-6 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
