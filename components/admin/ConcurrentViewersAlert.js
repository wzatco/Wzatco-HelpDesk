import React from 'react';
import { Users, Eye, AlertTriangle } from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';

/**
 * Alert component to show when multiple users are viewing the same ticket
 * Displays concurrent viewers with their names and types (admin/agent)
 */
export default function ConcurrentViewersAlert({ viewers, currentUserId }) {
  // Filter out current user
  const otherViewers = viewers.filter(v => v.userId !== currentUserId);

  if (otherViewers.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center">
            <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              {otherViewers.length === 1 
                ? 'Someone else is viewing this ticket' 
                : `${otherViewers.length} others are viewing this ticket`}
            </h3>
          </div>

          <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
            Be aware that multiple team members are currently working on this ticket. 
            Coordinate to avoid conflicting updates.
          </p>

          {/* Viewer List */}
          <div className="flex flex-wrap gap-2">
            {otherViewers.map((viewer) => (
              <div
                key={viewer.userId}
                className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 rounded-full px-3 py-1.5 border border-amber-200 dark:border-amber-700"
              >
                <Avatar className="w-5 h-5">
                  <AvatarFallback className={`text-[10px] font-bold ${
                    viewer.userType === 'admin' 
                      ? 'bg-violet-600 text-white' 
                      : 'bg-blue-600 text-white'
                  }`}>
                    {viewer.userName?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {viewer.userName}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  viewer.userType === 'admin'
                    ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                }`}>
                  {viewer.userType === 'admin' ? 'Admin' : 'Agent'}
                </span>
                <Eye className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
