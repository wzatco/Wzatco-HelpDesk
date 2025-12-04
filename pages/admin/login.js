import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Lock, Shield, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [captchaEnabled, setCaptchaEnabled] = useState(true); // Default to enabled

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/admin');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    fetchCaptchaSettings();
    fetchCaptcha();
  }, []);

  const fetchCaptchaSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/captcha');
      const data = await res.json();
      if (data.success && data.settings.enabledPlacements) {
        setCaptchaEnabled(data.settings.enabledPlacements.adminLogin !== false);
      }
    } catch (error) {
      console.error('Error fetching captcha settings:', error);
      // Default to enabled if error
      setCaptchaEnabled(true);
    }
  };

  const fetchCaptcha = async () => {
    try {
      const res = await fetch('/api/admin/captcha/generate');
      const data = await res.json();
      if (data.success) {
        setCaptcha(data.captcha);
      }
    } catch (error) {
      console.error('Error fetching captcha:', error);
    }
  };

  const refreshCaptcha = () => {
    fetchCaptcha();
    setCaptchaInput('');
    setCaptchaError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear all previous messages
    setError('');
    setSuccess('');
    setCaptchaError('');
    setLoading(true);

    // Validate captcha only if enabled
    if (captchaEnabled) {
      if (!captchaInput || captchaInput.trim().toUpperCase() !== captcha.toUpperCase()) {
        setCaptchaError('Invalid captcha. Please try again.');
        refreshCaptcha();
        setLoading(false);
        return;
      }
    }

    try {
      const result = await login(email, password, captchaInput, captcha);
      
      if (result.success) {
        setError(''); // Clear any errors
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          router.push('/admin');
        }, 500);
      } else {
        setLoading(false);
        setError(result.message || 'Login failed. Please try again.');
        refreshCaptcha();
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || 'An unexpected error occurred. Please try again.');
      refreshCaptcha();
    }
  };

  return (
    <>
      <Head>
        <title>Admin Login</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-violet-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-violet-200 dark:border-slate-700 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Admin Login
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Enter your credentials to access the admin panel
              </p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <p className="font-medium">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <p className="font-medium">{success}</p>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(''); // Clear error when user types
                  }}
                  required
                  disabled={loading}
                  className="w-full h-12 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="admin@example.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(''); // Clear error when user types
                  }}
                  required
                  disabled={loading}
                  className="w-full h-12 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter your password"
                />
              </div>

              {/* Captcha - Only show if enabled */}
              {captchaEnabled && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Security Verification *
                  </label>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-shrink-0 w-32 h-12 bg-gradient-to-r from-violet-100 to-purple-100 dark:from-slate-700 dark:to-slate-600 rounded-lg flex items-center justify-center border-2 border-violet-300 dark:border-slate-500">
                      <span className="text-2xl font-bold text-violet-700 dark:text-violet-300 tracking-wider select-none">
                        {captcha || '...'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={refreshCaptcha}
                      disabled={loading}
                      className="px-4 py-2 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Refresh captcha"
                    >
                      ↻ Refresh
                    </button>
                  </div>
                  <input
                    type="text"
                    value={captchaInput}
                    onChange={(e) => {
                      setCaptchaInput(e.target.value);
                      setCaptchaError('');
                      if (error) setError(''); // Also clear general error
                    }}
                    disabled={loading}
                    placeholder="Enter the code above"
                    className={`w-full h-12 px-4 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed ${
                      captchaError 
                        ? 'border-red-300 dark:border-red-700 focus:ring-red-500' 
                        : 'border-slate-300 dark:border-slate-600 focus:ring-violet-500'
                    } bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2`}
                    required
                  />
                  {captchaError && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{captchaError}</p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Please enter the code shown above to verify you're not a robot
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Login
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

