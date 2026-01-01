// Callback Scheduler - Schedule and manage phone callbacks
'use client';

import { useState, useEffect } from 'react';
import { Phone, Calendar, X, CheckCircle } from 'lucide-react';

export default function CallbackScheduler({ userInfo, onBack }) {
  const [activeTab, setActiveTab] = useState('schedule');
  const [selectedTime, setSelectedTime] = useState('tomorrow-8am');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneError, setPhoneError] = useState('');
  const [callbacks, setCallbacks] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const timeSlots = [
    { value: 'tomorrow-8am', label: 'Tomorrow, 8:00 AM' },
    { value: 'tomorrow-9am', label: 'Tomorrow, 9:00 AM' },
    { value: 'tomorrow-10am', label: 'Tomorrow, 10:00 AM' },
    { value: 'tomorrow-11am', label: 'Tomorrow, 11:00 AM' },
    { value: 'tomorrow-12pm', label: 'Tomorrow, 12:00 PM' },
    { value: 'tomorrow-1pm', label: 'Tomorrow, 1:00 PM' },
    { value: 'tomorrow-2pm', label: 'Tomorrow, 2:00 PM' },
    { value: 'tomorrow-3pm', label: 'Tomorrow, 3:00 PM' },
    { value: 'tomorrow-4pm', label: 'Tomorrow, 4:00 PM' },
    { value: 'tomorrow-5pm', label: 'Tomorrow, 5:00 PM' },
  ];

  useEffect(() => {
    loadCallbacks();
  }, []);

  const loadCallbacks = () => {
    const stored = localStorage.getItem(`widget_callbacks_${userInfo.email}`);
    if (stored) {
      setCallbacks(JSON.parse(stored));
    }
  };

  const validatePhone = (phone) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 0) return 'Phone number is required';
    if (digits.length < 10) return 'Phone number must be at least 10 digits';
    if (digits.length > 10) return 'Phone number must be exactly 10 digits';
    if (!/^[6-9]\d{9}$/.test(digits)) return 'Phone number must start with 6, 7, 8, or 9';
    return '';
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(value);
    setPhoneError(validatePhone(value));
  };

  const handleSchedule = () => {
    const error = validatePhone(phoneNumber);
    if (error) {
      setPhoneError(error);
      return;
    }

    const callback = {
      id: Date.now(),
      customerName: userInfo.name,
      customerEmail: userInfo.email,
      phoneNumber: `${countryCode} ${phoneNumber}`,
      scheduledTime: selectedTime,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };

    const existing = JSON.parse(localStorage.getItem(`widget_callbacks_${userInfo.email}`) || '[]');
    existing.push(callback);
    localStorage.setItem(`widget_callbacks_${userInfo.email}`, JSON.stringify(existing));
    
    setCallbacks(existing);
    setShowSuccess(true);
    setPhoneNumber('');
    setSelectedTime('tomorrow-8am');
    setTimeout(() => {
      setShowSuccess(false);
      setActiveTab('manage');
    }, 2000);
  };

  const handleCancel = (id) => {
    const updated = callbacks.filter(cb => cb.id !== id);
    localStorage.setItem(`widget_callbacks_${userInfo.email}`, JSON.stringify(updated));
    setCallbacks(updated);
  };

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Tabs */}
      <div className="bg-slate-700 text-white p-4">
        <div className="flex bg-slate-600 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'schedule'
                ? 'bg-white text-slate-700'
                : 'text-white hover:bg-slate-500'
            }`}
          >
            Schedule
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'manage'
                ? 'bg-white text-slate-700'
                : 'text-white hover:bg-slate-500'
            }`}
          >
            Manage ({callbacks.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'schedule' ? (
          <div className="space-y-4">
            <h4 className="text-white font-medium text-base mb-4">When should we call you back?</h4>

            {/* Time Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Select Time</label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                {timeSlots.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
              <div className="flex space-x-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="+91">+91</option>
                  <option value="+1">+1</option>
                </select>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  placeholder="10-digit number"
                  maxLength={10}
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              {phoneError && (
                <p className="text-red-400 text-sm mt-1">{phoneError}</p>
              )}
            </div>

            <button
              onClick={handleSchedule}
              disabled={!!phoneError || !phoneNumber}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all"
            >
              Schedule Call
            </button>

            {showSuccess && (
              <div className="bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Callback scheduled successfully!</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {callbacks.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No scheduled callbacks</p>
              </div>
            ) : (
              callbacks.map((callback) => (
                <div
                  key={callback.id}
                  className="p-4 bg-gray-800 border border-gray-700 rounded-xl"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-medium">
                        {timeSlots.find(s => s.value === callback.scheduledTime)?.label || callback.scheduledTime}
                      </p>
                      <p className="text-gray-400 text-sm">{callback.phoneNumber}</p>
                    </div>
                    <button
                      onClick={() => handleCancel(callback.id)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <span className="inline-block px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                    {callback.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

