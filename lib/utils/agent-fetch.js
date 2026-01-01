/**
 * Utility function for making authenticated API calls from agent frontend
 * Automatically includes the JWT token from localStorage
 */

export async function agentFetch(url, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('agentAuthToken') : null;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // If we get a 401, the token might be invalid - clear it
  if (response.status === 401 && typeof window !== 'undefined') {
    const data = await response.clone().json().catch(() => ({}));
    // If it's an invalid signature error, clear the token and redirect to login
    if (data.error === 'Unauthorized' || response.status === 401) {
      console.warn('⚠️  Authentication failed - clearing token');
      localStorage.removeItem('agentAuthToken');
      localStorage.removeItem('agentUser');
      // Only redirect if we're not already on the login page
      if (!window.location.pathname.includes('/agent/login')) {
        window.location.href = '/agent/login';
      }
    }
  }

  return response;
}

