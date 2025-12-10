// Login Form for Widget - Customer Name and Email
'use client';

import { useState, useEffect } from 'react';
import { User, Mail, ArrowRight, X } from 'lucide-react';

export default function LoginForm({ onSubmit, userInfo, onCancel, isEditMode = false }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (userInfo) {
      // Split existing name into first and last name
      const nameParts = (userInfo.name || '').split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      setEmail(userInfo.email || '');
    }
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
      email: email.trim().toLowerCase() 
    });
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
        </form>

        {/* Privacy Note */}
        <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
          Your information is secure and will only be used for support purposes.
        </p>
      </div>
    </div>
  );
}

