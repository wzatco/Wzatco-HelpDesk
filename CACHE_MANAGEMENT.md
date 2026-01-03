# Cache Management Documentation

This document describes the cache management system implemented to prevent issues with stale cached content after deployments on Hostinger.

## Overview

The system provides multiple endpoints and tools to clear browser and CDN caches after deployments, ensuring users always see the latest version of the application.

---

## API Endpoints

### 1. `/api/clear-cache`

Sends HTTP headers that instruct browsers and CDNs to clear their cache.

**Usage:**
```bash
# Simple call
curl https://help.wzatco.com/api/clear-cache

# With secret (if enabled)
curl https://help.wzatco.com/api/clear-cache?secret=YOUR_SECRET
```

**Response:**
```json
{
  "success": true,
  "message": "Cache clearing headers sent",
  "timestamp": "2025-01-03T10:30:00.000Z",
  "headers_sent": {
    "Cache-Control": "no-store, no-cache, must-revalidate...",
    "Clear-Site-Data": "\"cache\", \"cookies\", \"storage\""
  }
}
```

**Security (Optional):**
Add to `.env.production`:
```env
CACHE_CLEAR_SECRET=your-secret-key-here
```

---

### 2. `/api/force-refresh`

Generates instructions and scripts to force browser refresh.

**Modes:**

**JSON Mode (Default):**
```bash
curl https://help.wzatco.com/api/force-refresh
```

**HTML Mode (Auto-refresh page):**
```bash
curl https://help.wzatco.com/api/force-refresh?mode=html
```

Visit: `https://help.wzatco.com/api/force-refresh?mode=html`

This will display a styled page that automatically:
- Clears all caches
- Clears localStorage and sessionStorage
- Redirects to home page with cache-busting parameters

---

### 3. `/api/app-version`

Returns the current application version/build number. Useful for detecting when a new deployment has occurred.

**Usage:**
```bash
curl https://help.wzatco.com/api/app-version
```

**Response:**
```json
{
  "success": true,
  "version": "0.1.0",
  "buildTimestamp": "2025-01-03T10:00:00.000Z",
  "environment": "production"
}
```

**Setting Version:**
Add to `.env.production`:
```env
BUILD_VERSION=1.0.0
# or
NEXT_PUBLIC_BUILD_VERSION=1.0.0
```

---

## Cache Status Checker Page

### `/cache-check.html`

A standalone HTML page that checks if the user is running the latest version and provides a one-click cache clearing option.

**Features:**
- Real-time version checking
- Visual status indicators (up-to-date, outdated, checking)
- One-click cache clearing
- Auto-checks every 5 minutes
- Stores version in localStorage for comparison

**Access:**
```
https://help.wzatco.com/cache-check.html
```

**Share with users who experience issues:**
"If you're seeing old content, please visit: https://help.wzatco.com/cache-check.html"

---

## Deployment Integration

### Post-Deployment Script

Add this to your deployment workflow:

```bash
#!/bin/bash

# After successful build and deployment
echo "Deployment successful! Clearing caches..."

# Call the cache clearing endpoint
curl -X GET "https://help.wzatco.com/api/clear-cache" \
  -H "Content-Type: application/json"

echo "Cache clearing initiated!"
```

### With Secret:

```bash
curl -X GET "https://help.wzatco.com/api/clear-cache?secret=$CACHE_CLEAR_SECRET"
```

---

## Client-Side Auto-Update Detection

Add this to your `_app.js` or main layout to auto-detect updates:

```javascript
import { useEffect } from 'react';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Check for updates every 5 minutes
    const checkForUpdates = async () => {
      try {
        const response = await fetch('/api/app-version', { cache: 'no-store' });
        const data = await response.json();
        
        const storedVersion = localStorage.getItem('app_version');
        
        if (storedVersion && storedVersion !== data.version) {
          // New version available!
          if (confirm('A new version is available! Reload to update?')) {
            localStorage.setItem('app_version', data.version);
            window.location.reload(true);
          }
        } else if (!storedVersion) {
          localStorage.setItem('app_version', data.version);
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    };

    // Check on mount
    checkForUpdates();

    // Check every 5 minutes
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
```

---

## Manual Cache Clearing (For Users)

If users report seeing old content, provide these instructions:

### Windows / Linux:
- **Hard Refresh:** `Ctrl + Shift + R`
- **Clear Cache:** `Ctrl + Shift + Delete`

### Mac:
- **Hard Refresh:** `Cmd + Shift + R`
- **Clear Cache:** `Cmd + Shift + Delete`

### Alternative:
- Visit: `https://help.wzatco.com/cache-check.html`
- Click "Clear Cache & Reload"

---

## Environment Variables

Add these to your `.env.production` file (all optional):

```env
# Application version (defaults to package.json version)
BUILD_VERSION=1.0.0
# or
NEXT_PUBLIC_BUILD_VERSION=1.0.0

# Security for cache clearing endpoint (optional)
CACHE_CLEAR_SECRET=your-secure-random-string

# Security for force refresh endpoint (optional)
FORCE_REFRESH_SECRET=your-secure-random-string
```

---

## Testing

### Test Cache Clearing:

1. **Visit the app normally**
2. **Call the endpoint:**
   ```bash
   curl https://help.wzatco.com/api/clear-cache
   ```
3. **Reload the page** - should fetch fresh content

### Test Version Detection:

1. **Check current version:**
   ```bash
   curl https://help.wzatco.com/api/app-version
   ```
2. **Deploy a new version**
3. **Check again** - version should have changed

### Test Status Checker:

1. Visit: `https://help.wzatco.com/cache-check.html`
2. Should show "You are running the latest version"
3. Change the stored version in browser console:
   ```javascript
   localStorage.setItem('app_version', 'old-version');
   ```
4. Click "Check for Updates"
5. Should show "New version available"

---

## Hostinger Specific Notes

### CDN Cache:
Hostinger may cache content at the CDN level. The `Surrogate-Control` header helps with this, but you may need to:

1. **Clear Hostinger's CDN cache** from their control panel after deployment
2. **Use versioned URLs** for static assets (Next.js does this automatically)
3. **Contact support** if cache issues persist

### Deployment Workflow:

1. Deploy new build to Hostinger
2. Wait for deployment to complete
3. Call `/api/clear-cache` endpoint
4. (Optional) Clear CDN cache in Hostinger panel
5. Verify by visiting `/cache-check.html`

---

## Summary

- ✅ **3 API endpoints** for cache management
- ✅ **1 standalone HTML page** for user-friendly cache checking
- ✅ **Automatic update detection** (with optional client-side code)
- ✅ **Security options** with secret keys
- ✅ **Deployment integration** ready
- ✅ **User instructions** for manual clearing

All tools are ready to use immediately after deployment!

