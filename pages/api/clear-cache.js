/**
 * Cache Clearing API Endpoint
 * 
 * This endpoint sends HTTP headers that instruct browsers and CDNs to clear their cache.
 * Call this endpoint after deployment to force clients to fetch fresh content.
 * 
 * Usage:
 * GET https://help.wzatco.com/api/clear-cache
 * 
 * Optional query parameter:
 * ?secret=YOUR_SECRET - Add security to prevent unauthorized cache clearing
 */

export default function handler(req, res) {
  // Optional: Add a secret key for security
  // Uncomment and set in your .env file: CACHE_CLEAR_SECRET=your-secret-key
  // const secret = process.env.CACHE_CLEAR_SECRET;
  // if (secret && req.query.secret !== secret) {
  //   return res.status(401).json({ 
  //     success: false, 
  //     message: 'Unauthorized' 
  //   });
  // }

  // Set aggressive cache-clearing headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
  
  // Set CORS headers to allow cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Return success response with instructions
  return res.status(200).json({
    success: true,
    message: 'Cache clearing headers sent',
    timestamp: new Date().toISOString(),
    instructions: {
      browser: 'Browsers will be instructed to clear cache on next visit',
      manual: 'For immediate effect, users can press Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)',
      script: 'You can call this endpoint after deployment using: curl https://help.wzatco.com/api/clear-cache'
    },
    headers_sent: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
      'Clear-Site-Data': '"cache", "cookies", "storage"'
    }
  });
}

