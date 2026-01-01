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

  // Redirect if already authenticated (only once)
  useEffect(() => {
    if (isAuthenticated) {
      const redirectPath = router.query.redirect 
        ? decodeURIComponent(router.query.redirect) 
        : '/admin';
      // Use replace instead of push to prevent back button issues
      router.replace(redirectPath);
    }
  }, [isAuthenticated, router.query.redirect]); // Include router.query.redirect in deps

  // Fetch captcha settings and captcha only once on mount
  useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      try {
        // First fetch settings to check if CAPTCHA is enabled
        const settingsRes = await fetch('/api/admin/settings/captcha');
        
        if (!mounted) return;
        
        // Check if response is OK
        if (!settingsRes.ok) {
          console.error('Failed to fetch captcha settings:', settingsRes.status, settingsRes.statusText);
          // If API fails, default to disabled (user preference)
          if (mounted) {
            setCaptchaEnabled(false);
            setCaptcha('');
            setCaptchaInput('');
          }
          return;
        }
        
        const settingsData = await settingsRes.json();
        
        // Check if API call was successful
        if (!settingsData.success) {
          console.error('Captcha settings API returned error:', settingsData.message);
          // If API returns error, default to disabled (user preference)
          if (mounted) {
            setCaptchaEnabled(false);
            setCaptcha('');
            setCaptchaInput('');
          }
          return;
        }
        
        // Check if settings and enabledPlacements exist
        if (!settingsData.settings || !settingsData.settings.enabledPlacements) {
          console.warn('Captcha settings structure is invalid:', settingsData);
          // If structure is invalid, default to disabled
          if (mounted) {
            setCaptchaEnabled(false);
            setCaptcha('');
            setCaptchaInput('');
          }
          return;
        }
        
        // Explicitly check if adminLogin is true (not just not false)
        const isEnabled = settingsData.settings.enabledPlacements.adminLogin === true;
        
        if (mounted) {
          setCaptchaEnabled(isEnabled);
        }
        
        // Only fetch captcha if it's enabled
        if (isEnabled) {
          const captchaRes = await fetch('/api/admin/captcha/generate');
          if (!mounted) return;
          
          if (captchaRes.ok) {
            const captchaData = await captchaRes.json();
            if (captchaData.success && mounted) {
              setCaptcha(captchaData.captcha);
            }
          }
        } else {
          // Clear captcha if disabled
          if (mounted) {
            setCaptcha('');
            setCaptchaInput('');
          }
        }
      } catch (error) {
        console.error('Error fetching captcha data:', error);
        if (mounted) {
          // On error, default to disabled (respect user preference)
          setCaptchaEnabled(false);
          setCaptcha('');
          setCaptchaInput('');
        }
      }
    };
    
    fetchData();
    
    return () => {
      mounted = false;
    };
  }, []); // Empty deps - only run once

  const fetchCaptchaSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/captcha');
      const data = await res.json();
      if (data.success && data.settings?.enabledPlacements) {
        // Explicitly check if adminLogin is true
        const isEnabled = data.settings.enabledPlacements.adminLogin === true;
        setCaptchaEnabled(isEnabled);
        
        // If disabled, clear captcha
        if (!isEnabled) {
          setCaptcha('');
          setCaptchaInput('');
        } else if (!captcha) {
          // If enabled but no captcha, fetch it
          fetchCaptcha();
        }
      }
    } catch (error) {
      console.error('Error fetching captcha settings:', error);
      // Default to enabled if error (for security)
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
      if (!captcha || !captcha.trim()) {
        setCaptchaError('Captcha not loaded. Please refresh the page.');
        setLoading(false);
        return;
      }
      if (!captchaInput || captchaInput.trim().toUpperCase() !== captcha.toUpperCase()) {
        setCaptchaError('Invalid captcha. Please try again.');
        refreshCaptcha();
        setLoading(false);
        return;
      }
    }

    try {
      // Only pass captcha if enabled
      const result = await login(
        email, 
        password, 
        captchaEnabled ? captchaInput : '', 
        captchaEnabled ? captcha : ''
      );
      
      if (result.success) {
        setError(''); // Clear any errors
        setSuccess('Login successful! Redirecting...');
        
        // Get redirect URL from query parameter or default to /admin
        // Decode the redirect parameter in case it's URL-encoded
        const redirectPath = router.query.redirect 
          ? decodeURIComponent(router.query.redirect) 
          : '/admin';
        
        setTimeout(() => {
          // Use router.replace instead of push to prevent back button issues
          router.replace(redirectPath);
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

// Server-side check: If already authenticated, redirect to dashboard or previous page
export const getServerSideProps = async (context) => {
  const { req, query } = context;
  
  // Check if user is already authenticated
  const { getAuthenticatedUser } = await import('../../lib/server-auth');
  const user = await getAuthenticatedUser(req);
  
  if (user) {
    // User is already logged in, redirect to previous page or dashboard
    // Decode the redirect parameter in case it's URL-encoded
    const redirectPath = query.redirect 
      ? decodeURIComponent(query.redirect) 
      : '/admin';
    
    return {
      redirect: {
        destination: redirectPath,
        permanent: false,
      },
    };
  }
  
  return {
    props: {},
  };
};

