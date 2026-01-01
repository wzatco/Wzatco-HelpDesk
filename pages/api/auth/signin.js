// Widget Google Sign In - Direct redirect to NextAuth
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { provider, error } = req.query;

  // If NextAuth redirected here with an error, show error page
  if (error) {
    return res.status(400).send(`
      <html>
        <body>
          <script>
            window.opener?.postMessage({ 
              type: 'GOOGLE_AUTH_ERROR', 
              error: 'Google sign-in failed: ${error}' 
            }, window.location.origin);
            setTimeout(() => window.close(), 2000);
          </script>
          <p>Authentication error. Please close this window.</p>
        </body>
      </html>
    `);
  }

  if (provider === 'google') {
    // Build absolute callback URL
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const callbackUrl = `${protocol}://${host}/api/auth/widget-callback`;
    
    // Redirect to NextAuth Google provider with widget callback
    return res.redirect(`/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  res.status(400).json({ message: 'Invalid provider' });
}
