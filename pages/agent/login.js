import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Lock, Shield, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useAgentAuth } from '../../contexts/AgentAuthContext';

export default function AgentLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAgentAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect if already authenticated (only once)
  useEffect(() => {
    if (isAuthenticated) {
      const redirectPath = router.query.redirect || '/agent';
      router.replace(redirectPath);
    }
  }, [isAuthenticated, router.query.redirect]);

  // Captcha is permanently disabled

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear all previous messages
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Login without captcha (captcha is disabled)
      const result = await login(email, password, '', '');
      
      if (result.success) {
        setError(''); // Clear any errors
        setSuccess('Login successful! Redirecting...');
        // Use redirect parameter if available, otherwise default to /agent
        const redirectPath = router.query.redirect || '/agent';
        setTimeout(() => {
          router.replace(redirectPath);
        }, 500);
      } else {
        setLoading(false);
        setError(result.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <>
      <Head>
        <title>Agent Login</title>
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
                Agent Login
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Enter your credentials to access the agent panel
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
                  placeholder="agent@example.com"
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
  
  // Check if agent is already authenticated
  const { getCurrentAgentId } = await import('../../lib/utils/agent-auth');
  const agentId = await getCurrentAgentId(req);
  
  if (agentId) {
    // Agent is already logged in, redirect to previous page or dashboard
    const redirectPath = query.redirect || '/agent';
    
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

