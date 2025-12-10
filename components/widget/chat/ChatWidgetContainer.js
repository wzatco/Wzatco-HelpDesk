// New Chat Widget Container - AI-style chat interface
'use client';

import { useState, useEffect, useRef } from 'react';
import ChatInterface from './ChatInterface';
import LoginForm from './LoginForm';
import WidgetMenu from './WidgetMenu';
import OTPModal from '../OTPModal';
import { Minus, MessageSquare, User, LogOut, Edit2, ChevronDown, Menu } from 'lucide-react';

export default function ChatWidgetContainer({ isOpen, onClose, position = 'bottom-right' }) {
  const [userInfo, setUserInfo] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [currentView, setCurrentView] = useState('chat'); // 'chat', 'knowledge-base', 'tutorials', 'schedule-callback', 'tickets'
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const chatInterfaceRef = useRef(null);
  const profileMenuRef = useRef(null);

  // Check if user session is valid (3 months = 90 days)
  const isSessionValid = (userData) => {
    if (!userData || !userData.expiresAt) return false;
    const expiresAt = new Date(userData.expiresAt);
    return new Date() < expiresAt;
  };

  // Load user info on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('chat-widget-user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        if (isSessionValid(user)) {
          // Ensure firstName and lastName are set
          const userData = {
            name: user.name,
            firstName: user.firstName || user.name?.split(' ')[0] || '',
            lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
            email: user.email
          };
          setUserInfo(userData);
          setShowLogin(false);
        } else {
          // Session expired, clear and show login
          localStorage.removeItem('chat-widget-user');
          setShowLogin(true);
        }
      } catch (e) {
        console.error('Error loading saved user:', e);
        setShowLogin(true);
      }
    } else {
      setShowLogin(true);
    }
  }, []);

  // Save user info with 3-month expiration
  const saveUserInfo = (user, otpVerifiedAt = null) => {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 3); // 3 months from now
    
    // Load existing user data to preserve OTP verification status
    const existingUser = localStorage.getItem('chat-widget-user');
    let existingData = {};
    if (existingUser) {
      try {
        existingData = JSON.parse(existingUser);
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    const userData = {
      name: user.name, // Full name for display
      firstName: user.firstName || user.name?.split(' ')[0] || '',
      lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
      email: user.email,
      expiresAt: expiresAt.toISOString(),
      createdAt: existingData.createdAt || new Date().toISOString(),
      // Preserve OTP verification if session is still valid
      otpVerifiedAt: otpVerifiedAt || existingData.otpVerifiedAt || null
    };
    
    localStorage.setItem('chat-widget-user', JSON.stringify(userData));
    setUserInfo(userData);
    setShowLogin(false);
    setShowEditProfile(false);
  };

  // Handle login form submission
  const handleLogin = (user) => {
    // No OTP required at login - only when accessing tickets
    saveUserInfo(user);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('chat-widget-user');
    localStorage.removeItem('chat-widget-history'); // Optional: clear history on logout
    setUserInfo(null);
    setShowLogin(true);
    setShowProfileMenu(false);
  };

  // Handle profile edit
  const handleEditProfile = () => {
    setShowEditProfile(true);
    setShowProfileMenu(false);
  };

  // Handle OTP verification
  const handleOTPVerified = () => {
    if (pendingUser) {
      // Update user session with OTP verification timestamp
      const otpVerifiedAt = new Date().toISOString();
      saveUserInfo(pendingUser, otpVerifiedAt);
      
      // If we were trying to access tickets, navigate there now
      if (pendingUser.wantsTickets) {
        setCurrentView('tickets');
      }
      
      setPendingUser(null);
      setShowOTPVerification(false);
    }
  };

  // Handle OTP modal close
  const handleOTPClose = () => {
    setShowOTPVerification(false);
    setPendingUser(null);
    // Don't reset user session - just close the modal and go back to menu
    setCurrentView('menu');
    setShowMenu(true);
  };

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  const getPositionClasses = () => {
    const positions = {
      'bottom-right': 'bottom-0 sm:bottom-4 right-0 sm:right-4',
      'bottom-left': 'bottom-0 sm:bottom-4 left-0 sm:left-4',
      'top-right': 'top-0 sm:top-4 right-0 sm:right-4',
      'top-left': 'top-0 sm:top-4 left-0 sm:left-4',
    };
    return positions[position] || positions['bottom-right'];
  };

  return (
    <div className={`fixed ${getPositionClasses()} z-[9999] w-full h-full sm:w-auto sm:h-auto sm:max-w-[420px] sm:max-h-[700px]`}>
      <div className="w-full h-full sm:w-[420px] sm:h-[700px] bg-white dark:bg-gray-900 sm:rounded-xl shadow-2xl overflow-hidden flex flex-col sm:border border-gray-200 dark:border-gray-700">
        {/* Header - Only show if logged in */}
        {!showLogin && userInfo && (
          <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-red-600 text-white px-4 py-3 flex items-center justify-between relative">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">W</span>
              </div>
              <h2 className="text-sm font-semibold">WZATCO Support</h2>
            </div>
            <div className="flex items-center space-x-2">
              {/* Menu Toggle Button */}
              <button
                onClick={() => {
                  if (showMenu || currentView === 'menu') {
                    // Close menu and go to chat
                    setShowMenu(false);
                    setCurrentView('chat');
                  } else {
                    // Open menu
                    setShowMenu(true);
                    setCurrentView('menu');
                  }
                }}
                className={`p-1.5 hover:bg-white/20 rounded transition-all duration-200 ${(showMenu || currentView === 'menu') ? 'bg-white/30' : ''}`}
                title="Support Options"
              >
                <Menu className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (chatInterfaceRef.current) {
                    chatInterfaceRef.current.startNewChat();
                  }
                  setShowMenu(false);
                  setCurrentView('chat');
                }}
                className="p-1.5 hover:bg-white/20 rounded transition-all duration-200"
                title="Start New Chat"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              
              {/* Profile Menu */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="p-1.5 hover:bg-white/20 rounded transition-all duration-200 flex items-center space-x-1"
                  title="Profile"
                >
                  <User className="w-4 h-4" />
                  <ChevronDown className={`w-3 h-3 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Profile Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{userInfo.name}</p>
                      <p className="text-xs text-gray-500 truncate">{userInfo.email}</p>
                    </div>
                    <button
                      onClick={handleEditProfile}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit Profile</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={onClose}
                className="p-1 hover:bg-white/20 rounded transition-all duration-200"
                title="Minimize Widget"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-white relative">
          {/* Menu Overlay */}
          {(showMenu || currentView === 'menu') && !showLogin && !showEditProfile && (
            <WidgetMenu
              isOpen={showMenu || currentView === 'menu'}
              onClose={() => {
                setShowMenu(false);
                setCurrentView('chat');
              }}
              onSelectOption={async (optionId) => {
                // If tickets option selected, check if OTP verification is needed
                if (optionId === 'tickets' && userInfo?.email) {
                  try {
                    // Check if email has tickets
                    const checkResponse = await fetch(`/api/widget/tickets/check?email=${encodeURIComponent(userInfo.email)}`);
                    const checkData = await checkResponse.json();
                    
                    if (checkData.success && checkData.hasTickets) {
                      // Check if session is valid and OTP was verified
                      const savedUser = localStorage.getItem('chat-widget-user');
                      if (savedUser) {
                        try {
                          const userData = JSON.parse(savedUser);
                          
                          // Check if session is still valid
                          if (isSessionValid(userData)) {
                            // Check if OTP was verified (and verification is still valid - same session)
                            if (userData.otpVerifiedAt) {
                              // OTP was verified in this session - allow access
                              setCurrentView(optionId);
                              setShowMenu(false);
                              return;
                            }
                          }
                          // Session expired or OTP not verified - require OTP
                        } catch (e) {
                          // Parse error - require OTP
                        }
                      }
                      
                      // Show OTP modal and send OTP
                      setPendingUser({ ...userInfo, wantsTickets: true });
                      setShowOTPVerification(true);
                      setShowMenu(false);
                      return; // Don't navigate to tickets yet
                    }
                  } catch (error) {
                    console.error('Error checking tickets:', error);
                    // If check fails, proceed with navigation (fail open)
                  }
                }
                
                // For other options or if no tickets/OTP verified, proceed normally
                setCurrentView(optionId);
                setShowMenu(false);
              }}
              userInfo={userInfo}
            />
          )}

          {/* Main Content */}
          {!showMenu && currentView !== 'menu' && (
            <>
              {showLogin || showEditProfile ? (
                <LoginForm 
                  onSubmit={showEditProfile ? saveUserInfo : handleLogin}
                  userInfo={showEditProfile ? userInfo : null}
                  onCancel={showEditProfile ? () => setShowEditProfile(false) : null}
                  isEditMode={showEditProfile}
                />
              ) : (
                <ChatInterface 
                  ref={chatInterfaceRef}
                  userInfo={userInfo}
                  currentView={currentView}
                  onViewChange={(view) => {
                    setCurrentView(view);
                    if (view === 'menu') {
                      setShowMenu(true);
                    } else if (view !== 'menu') {
                      setShowMenu(false);
                    }
                  }}
                  onNewChat={() => {
                    setCurrentView('chat');
                    setShowMenu(false);
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOTPVerification && pendingUser && (
        <OTPModal
          email={pendingUser.email}
          onVerify={handleOTPVerified}
          onClose={handleOTPClose}
        />
      )}
    </div>
  );
}

