// Login Form for Widget - Customer Name and Email
'use client';

import { useState, useEffect } from 'react';
import { User, Mail, ArrowRight, X, Minus } from 'lucide-react';

export default function LoginForm({ onSubmit, userInfo, onCancel, onClose, isEditMode = false }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [isGoogleAuthEnabled, setIsGoogleAuthEnabled] = useState(false);

  useEffect(() => {
    if (userInfo) {
      // Split existing name into first and last name
      const nameParts = (userInfo.name || '').split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      setEmail(userInfo.email || '');
    }
    
    // Check if Google Auth is enabled
    fetch('/api/settings/google-auth-status')
      .then(res => res.json())
      .then(data => setIsGoogleAuthEnabled(data.enabled))
      .catch(() => setIsGoogleAuthEnabled(false));
  }, [userInfo]);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    // Combine first and last name, but store separately
    const fullName = `${firstName.trim()}${lastName.trim() ? ' ' + lastName.trim() : ''}`;
    onSubmit({ 
      name: fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      authMethod: 'email' // Mark as email authenticated
    });
  };

  const handleGoogleSignIn = async () => {
    try {
      // Open Google OAuth in a popup
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        '/api/auth/signin/google?callbackUrl=' + encodeURIComponent('/api/auth/widget-callback'),
        'Google Sign In',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for message from popup
      const messageHandler = (event) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_AUTH_SUCCESS' && event.data.user) {
          const user = event.data.user;
          onSubmit({
            name: user.name,
            firstName: user.name?.split(' ')[0] || '',
            lastName: user.name?.split(' ').slice(1).join(' ') || '',
            email: user.email,
            image: user.image,
            authMethod: 'google' // Mark as Google authenticated
          });
          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          setErrors({ general: event.data.error || 'Google sign-in failed' });
          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
        }
      };

      window.addEventListener('message', messageHandler);

      // Cleanup if popup is closed
      const checkClosed = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
        }
      }, 500);
    } catch (error) {
      console.error('Google Sign In error:', error);
      setErrors({ general: 'Failed to sign in with Google' });
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative">
      {/* Minimize Button - Top Right */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-full transition-all duration-200 z-10 group"
          title="Minimize Widget"
        >
          <Minus className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
        </button>
      )}
      
      <div className="w-full max-w-sm">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 rounded-2xl flex items-center justify-center shadow-lg dark:shadow-purple-500/20">
            <span className="text-white text-2xl font-bold">W</span>
          </div>
        </div>

        {/* Welcome Text */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {isEditMode ? 'Edit Your Profile' : 'Welcome to WZATCO Support'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isEditMode ? 'Update your information' : 'Please provide your details to get started'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              First Name <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (errors.firstName) setErrors({ ...errors, firstName: '' });
                }}
                placeholder="Enter your first name"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-pink-500 focus:border-transparent text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                  errors.firstName 
                    ? 'border-red-300 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
            </div>
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Last Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                }}
                placeholder="Enter your last name (optional)"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-pink-500 focus:border-transparent text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                placeholder="Enter your email"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-pink-500 focus:border-transparent text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                  errors.email 
                    ? 'border-red-300 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex space-x-3">
            {isEditMode && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            )}
            <button
              type="submit"
              className={`${isEditMode && onCancel ? 'flex-1' : 'w-full'} bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white py-3 rounded-lg font-medium hover:shadow-lg dark:hover:shadow-purple-500/30 transition-all duration-200 flex items-center justify-center space-x-2`}
            >
              <span>{isEditMode ? 'Save Changes' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Divider - Only show on login (not edit mode) */}
          {/* Divider - Only show if Google Auth enabled */}
          {!isEditMode && isGoogleAuthEnabled && (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-500 dark:text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>
          )}

          {/* Google Sign In Button - Only show if enabled and not in edit mode */}
          {!isEditMode && isGoogleAuthEnabled && (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 flex items-center justify-center space-x-3 shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Sign in with Google</span>
            </button>
          )}
        </form>

        {/* Privacy Note */}
        <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
          Your information is secure and will only be used for support purposes.
        </p>
      </div>
    </div>
  );
}

