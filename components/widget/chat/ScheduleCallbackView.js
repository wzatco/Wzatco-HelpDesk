// Schedule Callback View for Widget
'use client';

import { useState } from 'react';
import { Calendar, Clock, Phone, ArrowLeft, Check } from 'lucide-react';

export default function ScheduleCallbackView({ userInfo, onBack }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const timeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !phoneNumber) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch('/api/widget/schedule-callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedDate,
          time: selectedTime,
          phoneNumber,
          email: userInfo?.email,
          name: userInfo?.name
        })
      });

      const data = await response.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        alert(data.message || 'Failed to schedule callback');
      }
    } catch (error) {
      console.error('Error scheduling callback:', error);
      alert('Failed to schedule callback. Please try again.');
    }
  };

  if (submitted) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-900 animate-slide-in">
        <div className="flex-1 flex items-center justify-center p-6 bg-white dark:bg-gray-900">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Callback Scheduled!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              We'll call you on {selectedDate} at {selectedTime}
            </p>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-purple-600 dark:bg-pink-600 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-pink-700 transition-colors text-sm"
            >
              Back to Support
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 animate-slide-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-red-600 text-white px-4 py-3 flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-1 hover:bg-white/20 rounded transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center space-x-2 flex-1">
          <Phone className="w-4 h-4" />
          <h2 className="text-sm font-semibold">Schedule Callback</h2>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-gray-900">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-pink-500 text-sm"
              required
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Select Time
            </label>
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedTime === time
                      ? 'bg-purple-600 dark:bg-pink-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91 1234567890"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-pink-500 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white py-3 rounded-lg font-medium hover:shadow-lg dark:hover:shadow-purple-500/30 transition-all duration-200"
          >
            Schedule Callback
          </button>
        </form>
      </div>
    </div>
  );
}

