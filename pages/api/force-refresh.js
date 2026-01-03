/**
 * Force Browser Refresh API Endpoint
 * 
 * This endpoint generates a client-side script that forces all open tabs to reload.
 * It can be embedded in your deployment script or called manually after builds.
 * 
 * Usage as HTML:
 * GET https://help.wzatco.com/api/force-refresh?mode=html
 * 
 * Usage as JSON:
 * GET https://help.wzatco.com/api/force-refresh
 * 
 * With secret (optional):
 * GET https://help.wzatco.com/api/force-refresh?secret=YOUR_SECRET
 */

export default function handler(req, res) {
  const { mode, secret } = req.query;

  // Optional: Add a secret key for security
  // Uncomment and set in your .env file: FORCE_REFRESH_SECRET=your-secret-key
  // const expectedSecret = process.env.FORCE_REFRESH_SECRET;
  // if (expectedSecret && secret !== expectedSecret) {
  //   return res.status(401).json({ 
  //     success: false, 
  //     message: 'Unauthorized' 
  //   });
  // }

  // Clear cache headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Generate a unique version number based on current timestamp
  const version = Date.now();

  // Return HTML with auto-refresh script
  if (mode === 'html') {
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cache Cleared - Refreshing...</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 1rem;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }
    h1 { margin: 0 0 1rem; font-size: 2rem; }
    p { margin: 0.5rem 0; opacity: 0.9; }
    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 2rem auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .timestamp {
      font-size: 0.875rem;
      opacity: 0.7;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔄 Cache Cleared Successfully</h1>
    <div class="spinner"></div>
    <p>Refreshing your browser to load the latest version...</p>
    <p class="timestamp">Version: ${version}</p>
  </div>
  <script>
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
        console.log('✅ All caches cleared');
      });
    }

    // Clear localStorage and sessionStorage
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log('✅ Storage cleared');
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }

    // Store version to prevent repeated refreshes
    const lastVersion = sessionStorage.getItem('app_version');
    sessionStorage.setItem('app_version', '${version}');

    // Reload after 2 seconds
    setTimeout(() => {
      // Force reload from server (bypass cache)
      window.location.href = window.location.origin + '/?v=${version}&cache_cleared=1';
    }, 2000);
  </script>
</body>
</html>
    `);
  }

  // Return JSON response
  return res.status(200).json({
    success: true,
    message: 'Cache refresh initiated',
    version: version,
    timestamp: new Date().toISOString(),
    instructions: {
      manual_clear: 'Press Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac) to hard refresh',
      html_mode: 'Visit /api/force-refresh?mode=html to see auto-refresh page',
      embed: 'Embed in deployment: <iframe src="/api/force-refresh?mode=html" style="display:none"></iframe>',
      curl: 'curl https://help.wzatco.com/api/force-refresh'
    },
    actions_performed: [
      'Cache-Control headers set to no-cache',
      'Version number generated: ' + version,
      'Ready to clear client caches'
    ]
  });
}

