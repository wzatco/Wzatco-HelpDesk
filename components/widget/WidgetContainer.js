// Main Widget Container - Handles login, menu, and view routing
'use client';

import { useState, useEffect } from 'react';
import LoginScreen from './LoginScreen';
import MainMenu from './MainMenu';
import KnowledgeBase from './KnowledgeBase';
import TicketManagement from './TicketManagement';
import CallbackScheduler from './CallbackScheduler';
import Tutorials from './Tutorials';
import ProfileManagement from './ProfileManagement';
import OTPModal from './OTPModal';
import RatingModal from './RatingModal';
import { Minus } from 'lucide-react';

export default function WidgetContainer({ isOpen, onClose, position = 'bottom-right' }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: '', email: '' });
  const [activeView, setActiveView] = useState(null);
  const [showOTP, setShowOTP] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingData, setRatingData] = useState({ rating: null, feedback: '' });

  // Check if user is already logged in
  useEffect(() => {
    const savedUser = localStorage.getItem('widget-user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setUserInfo({ name: user.name, email: user.email });
        setIsLoggedIn(true);
      } catch (e) {
        console.error('Error loading saved user:', e);
      }
    }
  }, []);

  const handleLogin = async (name, email) => {
    // Save user info
    const user = { name, email, loginTime: new Date().toISOString() };
    localStorage.setItem('widget-user', JSON.stringify(user));
    setUserInfo({ name, email });
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('widget-user');
    localStorage.removeItem('widget-chat-id');
    localStorage.removeItem('widget-customer-id');
    setIsLoggedIn(false);
    setUserInfo({ name: '', email: '' });
    setActiveView(null);
  };

  const handleViewChange = (viewId) => {
    // Check if OTP is needed for tickets
    if (viewId === 'tickets') {
      const lastOTPDate = localStorage.getItem('widget-otp-date');
      const today = new Date().toDateString();
      
      if (!lastOTPDate || lastOTPDate !== today) {
        setShowOTP(true);
        return;
      }
    }
    setActiveView(viewId);
  };

  const handleOTPVerified = () => {
    setShowOTP(false);
    setActiveView('tickets');
    localStorage.setItem('widget-otp-date', new Date().toDateString());
  };

  const handleBackToMenu = () => {
    setActiveView(null);
  };

  const getPositionClasses = () => {
    const positions = {
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
    };
    return positions[position] || positions['bottom-right'];
  };

  const renderView = () => {
    switch (activeView) {
      case 'kb':
        return <KnowledgeBase onBack={handleBackToMenu} />;
      case 'tickets':
        return <TicketManagement userInfo={userInfo} onBack={handleBackToMenu} />;
      case 'call-schedule':
        return <CallbackScheduler userInfo={userInfo} onBack={handleBackToMenu} />;
      case 'tutorials':
        return <Tutorials onBack={handleBackToMenu} />;
      case 'profile':
        return <ProfileManagement userInfo={userInfo} onBack={handleBackToMenu} onLogout={handleLogout} />;
      default:
        return null;
    }
  };

  return (
    <div className={`fixed ${getPositionClasses()} z-[9999]`}>
      <div className="w-[calc(100vw-2rem)] sm:w-[360px] max-w-[360px] h-[calc(100vh-2rem)] sm:h-[520px] max-h-[520px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header with Minimize Button */}
        {(isLoggedIn || activeView) && (
          <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-red-600 text-white px-3 py-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">WZATCO Support</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded transition-all duration-200"
              title="Minimize Widget"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900">
          {!isLoggedIn ? (
            <LoginScreen onLogin={handleLogin} />
          ) : !activeView ? (
            <MainMenu userInfo={userInfo} onViewChange={handleViewChange} onLogout={handleLogout} />
          ) : (
            <div className="h-full flex flex-col">
              {/* View Header */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleBackToMenu}
                    className="p-1 hover:bg-white/20 rounded transition-all"
                  >
                    <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <h3 className="text-sm font-semibold">
                    {activeView === 'kb' && 'Knowledge Base'}
                    {activeView === 'tickets' && 'Ticket Management'}
                    {activeView === 'call-schedule' && 'Schedule Call Back'}
                    {activeView === 'tutorials' && 'Projector Tutorials'}
                    {activeView === 'profile' && 'Profile'}
                  </h3>
                </div>
              </div>

              {/* View Content */}
              <div className="flex-1 overflow-hidden">
                {renderView()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showOTP && (
        <OTPModal
          email={userInfo.email}
          onVerify={handleOTPVerified}
          onClose={() => setShowOTP(false)}
        />
      )}

      {showRating && (
        <RatingModal
          onSubmit={(rating, feedback) => {
            setRatingData({ rating, feedback });
            setShowRating(false);
            setActiveView(null);
          }}
          onSkip={() => {
            setShowRating(false);
            setActiveView(null);
          }}
        />
      )}

    </div>
  );
}

