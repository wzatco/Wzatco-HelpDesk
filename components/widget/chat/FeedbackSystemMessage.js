// Feedback System Message Component - Displays customer feedback in chat stream
'use client';

import { Star, CheckCircle } from 'lucide-react';

export default function FeedbackSystemMessage({ feedback }) {
  if (!feedback) return null;

  const { rating, comment, submittedAt, customerName } = feedback;

  // Generate star display
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${
            i <= rating
              ? 'fill-amber-400 text-amber-400'
              : 'fill-slate-300 text-slate-300 dark:fill-slate-600 dark:text-slate-600'
          }`}
        />
      );
    }
    return stars;
  };

  return (
    <div className="flex justify-center my-4 w-full">
      <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 rounded-lg p-4 mx-auto max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {customerName || 'Customer'} rated this ticket:
          </span>
        </div>
        
        {/* Star Rating */}
        <div className="flex items-center justify-center gap-1 mb-2">
          {renderStars()}
        </div>

        {/* Comment */}
        {comment && (
          <p className="text-xs text-slate-600 dark:text-slate-400 italic mt-2">
            "{comment}"
          </p>
        )}

        {/* Timestamp */}
        {submittedAt && (
          <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-2">
            {new Date(submittedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        )}
      </div>
    </div>
  );
}

