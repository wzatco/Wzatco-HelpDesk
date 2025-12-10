// OTP Verification Modal
'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function OTPModal({ email, onVerify, onClose }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);

  // Send OTP automatically when modal opens
  useEffect(() => {
    if (email) {
      const sendOTP = async () => {
        setError('');
        setSendingOTP(true);
        try {
          const response = await fetch('/api/widget/otp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const data = await response.json();
          if (data.success) {
            setError('');
            // Security: OTP is never logged or displayed in console
            setOtp('');
          } else {
            setError(data.message || 'Failed to send OTP');
          }
        } catch (error) {
          setError('Failed to send OTP. Please try again.');
        } finally {
          setSendingOTP(false);
        }
      };
      sendOTP();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/widget/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json();
      if (data.success) {
        onVerify();
      } else {
        setError(data.message || 'Invalid OTP');
      }
    } catch (error) {
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSendingOTP(true);
    try {
      const response = await fetch('/api/widget/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (data.success) {
        setError('');
        // Security: OTP is never logged or displayed in console
        setOtp('');
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setSendingOTP(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000]">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md mx-4 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Email Verification</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-gray-300 mb-6">
          {sendingOTP ? (
            <span className="block">Sending verification code to <strong>{email}</strong>...</span>
          ) : (
            <span>We've sent a 6-digit verification code to <strong>{email}</strong>. Please enter it below.</span>
          )}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Verification Code</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-center text-2xl tracking-widest"
              placeholder="000000"
              maxLength={6}
              required
            />
          </div>

          {error && (
            <div className="bg-pink-900/40 border-l-4 border-pink-500 text-pink-100 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              className="text-pink-300 hover:text-pink-200 text-sm font-medium underline"
            >
              Didn't receive the code? Resend
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

