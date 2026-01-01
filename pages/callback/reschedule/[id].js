// Customer-facing page to accept/reject rescheduled callback
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { CheckCircle2, XCircle, Loader2, Calendar, Clock } from 'lucide-react';

export default function RescheduleCallbackPage() {
  const router = useRouter();
  const { id } = router.query;
  const { action, token } = router.query;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [callback, setCallback] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (id && action) {
      fetchCallback();
    }
  }, [id, action]);

  const fetchCallback = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/widget/callbacks/${id}`);
      const data = await response.json();
      if (response.ok) {
        setCallback(data.callback);
      } else {
        setError(data.message || 'Callback not found');
      }
    } catch (err) {
      console.error('Error fetching callback:', err);
      setError('Failed to load callback information');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionType) => {
    try {
      setSubmitting(true);
      const response = await fetch(`/api/widget/callbacks/${id}/reschedule-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, token })
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(data.message || `Callback ${actionType === 'accept' ? 'accepted' : 'rejected'} successfully`);
        setTimeout(() => {
          window.close();
        }, 3000);
      } else {
        setError(data.message || 'Failed to process request');
      }
    } catch (err) {
      console.error('Error processing reschedule response:', err);
      setError('Failed to process request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30">
        <div className="text-center max-w-md p-6 bg-white rounded-xl shadow-lg">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (message) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30">
        <div className="text-center max-w-md p-6 bg-white rounded-xl shadow-lg">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Success!</h2>
          <p className="text-gray-600">{message}</p>
          <p className="text-sm text-gray-500 mt-4">This window will close automatically...</p>
        </div>
      </div>
    );
  }

  if (!callback) {
    return null;
  }

  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'N/A';
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Head>
        <title>Reschedule Callback - WZATCO</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50/30 to-purple-50/30 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 via-pink-600 to-red-600 text-white p-6">
            <h1 className="text-2xl font-bold">Callback Rescheduled</h1>
            <p className="text-violet-100 mt-1">Please review and respond</p>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <p className="text-gray-700 mb-4">Hello {callback.customerName},</p>
              <p className="text-gray-600 mb-4">We need to reschedule your callback. Please review the new time:</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-red-900">Previous Time</h3>
              </div>
              <p className="text-red-700">{formatDateTime(callback.scheduledTime)}</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-900">New Proposed Time</h3>
              </div>
              <p className="text-green-700">{formatDateTime(callback.rescheduledTime)}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleAction('accept')}
                disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Accept New Time
              </button>
              <button
                onClick={() => handleAction('reject')}
                disabled={submitting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

