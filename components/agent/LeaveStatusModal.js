'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { agentFetch } from '../../lib/utils/agent-fetch';

export default function LeaveStatusModal({ isOpen, onClose, onStatusChange }) {
  const [status, setStatus] = useState('ACTIVE');
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  // Fetch current status on mount
  useEffect(() => {
    if (isOpen) {
      fetchCurrentStatus();
    }
  }, [isOpen]);

  const fetchCurrentStatus = async () => {
    try {
      setFetching(true);
      const res = await agentFetch('/api/agent/leave-status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status || 'ACTIVE');
        setLeaveFrom(data.leaveFrom ? new Date(data.leaveFrom).toISOString().split('T')[0] : '');
        setLeaveTo(data.leaveTo ? new Date(data.leaveTo).toISOString().split('T')[0] : '');
      }
    } catch (err) {
      console.error('Error fetching leave status:', err);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        status: status === 'ACTIVE' ? 'ACTIVE' : 'ON_LEAVE',
      };

      if (status === 'ON_LEAVE') {
        if (!leaveFrom) {
          setError('Please select a start date');
          setLoading(false);
          return;
        }
        payload.from = leaveFrom;
        if (leaveTo) {
          payload.to = leaveTo;
        }
      }

      const res = await agentFetch('/api/agent/leave-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (onStatusChange) {
          onStatusChange(data);
        }
        onClose();
        // Show success message
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('showToast', {
            detail: {
              type: 'success',
              message: data.message || (status === 'ON_LEAVE' ? 'You are now on leave' : 'You are now active'),
            }
          }));
        }
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating leave status:', err);
      setError('Failed to update status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Update Status</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {fetching ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
          ) : (
            <>
              {/* Status Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Current Status
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus('ACTIVE')}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${
                      status === 'ACTIVE'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="font-medium">Active</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('ON_LEAVE')}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${
                      status === 'ON_LEAVE'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="font-medium">On Leave</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Active Status Content */}
              {status === 'ACTIVE' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Welcome Back!
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        You are currently active and available to receive new ticket assignments.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* On Leave Status Content */}
              {status === 'ON_LEAVE' && (
                <div className="space-y-4">
                  {/* Warning */}
                  <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        Important Notice
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        All your active tickets will be unassigned and made available for other agents to claim.
                      </p>
                    </div>
                  </div>

                  {/* Date Range Picker */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Leave From <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={leaveFrom}
                        onChange={(e) => setLeaveFrom(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Leave To (Optional)
                      </label>
                      <input
                        type="date"
                        value={leaveTo}
                        onChange={(e) => setLeaveTo(e.target.value)}
                        min={leaveFrom || new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                      {leaveTo && leaveFrom && new Date(leaveTo) < new Date(leaveFrom) && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          End date must be after start date
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Current Leave Info */}
                  {leaveFrom && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-medium">Leave Period:</span>{' '}
                        {new Date(leaveFrom).toLocaleDateString()}
                        {leaveTo && ` - ${new Date(leaveTo).toLocaleDateString()}`}
                        {!leaveTo && ' (No end date)'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}
            </>
          )}
        </form>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || fetching || (status === 'ON_LEAVE' && !leaveFrom)}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              'Confirm'
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

