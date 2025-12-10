// Login Screen - Name + Email input
'use client';

import { useState } from 'react';

export default function LoginScreen({ onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    onLogin(name.trim(), email.trim().toLowerCase());
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header with Logo */}
      <div
        className="bg-gradient-to-r from-purple-700 via-pink-600 to-red-600 text-white px-3 py-3"
        style={{
          background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 50%, #EF4444 100%)',
        }}
      >
        <div className="flex flex-col items-center space-y-1.5">
          {/* Logo Placeholder */}
          <div className="w-32 h-10 flex items-center justify-center bg-white/20 rounded border border-white/30">
            <span className="text-white font-bold text-sm tracking-wide">WZATCO</span>
          </div>
          <div className="text-center space-y-0.5">
            <h2 className="text-xs font-semibold tracking-tight text-white">Welcome to Your Support Portal</h2>
            <p className="text-[10px] text-white/90">"Quick help. Hassle-free."</p>
          </div>
        </div>
      </div>

      {/* Login Form */}
      <div className="flex-1 p-4 bg-gray-900 flex flex-col overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4 flex-1">
          <div>
            <label className="block text-xs font-semibold text-white mb-1.5">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200 placeholder-gray-500"
              placeholder="Enter your name"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200 placeholder-gray-500"
              placeholder="Enter your email address"
              required
            />
          </div>

          {error && (
            <div className="bg-pink-900/40 border-l-2 border-pink-500 text-pink-100 px-3 py-2 rounded-lg text-xs font-medium">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                <span>{error}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold rounded-lg shadow-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99]"
          >
            Continue to Support
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-pink-300 text-[10px]">
            We'll use this info to personalize your support experience
          </p>
        </div>

        <div className="mt-auto pt-3 text-center text-[10px] text-gray-500">
          © WZATCO 2025. All rights reserved.
        </div>
      </div>
    </div>
  );
}

