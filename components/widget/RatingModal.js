// Rating Modal - Post-chat feedback
'use client';

import { useState } from 'react';

export default function RatingModal({ onSubmit, onSkip }) {
  const [rating, setRating] = useState(null);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (rating) {
      onSubmit(rating, feedback);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10001]">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white p-6 text-center">
          <h3 className="text-xl font-bold text-white mb-1">Rate your conversation</h3>
          <p className="text-white/90 text-sm">How was your experience with us?</p>
        </div>

        <div className="p-6">
          {/* Rating Options */}
          <div className="flex justify-center gap-6 mb-6">
            {/* Not Satisfied */}
            <button
              onClick={() => setRating('not-satisfied')}
              className={`flex flex-col items-center transition-all duration-300 ${
                rating === 'not-satisfied' ? 'scale-110' : 'opacity-60 hover:opacity-100'
              }`}
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-2 transition-all ${
                rating === 'not-satisfied'
                  ? 'bg-red-100 ring-4 ring-red-500'
                  : 'bg-gray-100 hover:bg-red-50'
              }`}>
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="#EF4444" />
                  <path d="M8 15C8 15 9 13 12 13C15 13 16 15 16 15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="9" cy="9" r="1" fill="white"/>
                  <circle cx="15" cy="9" r="1" fill="white"/>
                </svg>
              </div>
              <span className={`text-sm font-semibold ${
                rating === 'not-satisfied' ? 'text-red-600' : 'text-gray-600'
              }`}>
                Not Satisfied
              </span>
            </button>

            {/* Okay */}
            <button
              onClick={() => setRating('okay')}
              className={`flex flex-col items-center transition-all duration-300 ${
                rating === 'okay' ? 'scale-110' : 'opacity-60 hover:opacity-100'
              }`}
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-2 transition-all ${
                rating === 'okay'
                  ? 'bg-yellow-100 ring-4 ring-yellow-500'
                  : 'bg-gray-100 hover:bg-yellow-50'
              }`}>
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="#F59E0B" />
                  <path d="M8 14H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="9" cy="9" r="1" fill="white"/>
                  <circle cx="15" cy="9" r="1" fill="white"/>
                </svg>
              </div>
              <span className={`text-sm font-semibold ${
                rating === 'okay' ? 'text-yellow-600' : 'text-gray-600'
              }`}>
                Okay
              </span>
            </button>

            {/* Satisfied */}
            <button
              onClick={() => setRating('satisfied')}
              className={`flex flex-col items-center transition-all duration-300 ${
                rating === 'satisfied' ? 'scale-110' : 'opacity-60 hover:opacity-100'
              }`}
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-2 transition-all ${
                rating === 'satisfied'
                  ? 'bg-green-100 ring-4 ring-green-500'
                  : 'bg-gray-100 hover:bg-green-50'
              }`}>
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="#10B981" />
                  <path d="M8 13C8 13 9.5 16 12 16C14.5 16 16 13 16 13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="9" cy="9" r="1" fill="white"/>
                  <circle cx="15" cy="9" r="1" fill="white"/>
                </svg>
              </div>
              <span className={`text-sm font-semibold ${
                rating === 'satisfied' ? 'text-green-600' : 'text-gray-600'
              }`}>
                Satisfied
              </span>
            </button>
          </div>

          {/* Feedback Text Area */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tell us more... (Optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your thoughts about our service"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none resize-none text-gray-700 placeholder-gray-400"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onSkip}
              className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={!rating}
              className={`flex-1 py-3 px-4 rounded-xl transition-all duration-200 font-semibold shadow-lg ${
                rating
                  ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Submit Rating
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

