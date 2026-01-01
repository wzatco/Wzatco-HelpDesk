# How to View Server Logs on Hostinger Cloud

**Date:** January 1, 2026  
**Purpose:** Find server startup logs and monitor application health

---

## 📍 Where Server Logs Are Located

### Important: Server Logs vs Browser Console

| Log Type | Location | What You See |
|----------|----------|--------------|
| **Server Logs** ✅ | Hostinger Control Panel | Server startup, port binding, environment loading |
| **Browser Console** ❌ | Browser DevTools (F12) | Client-side JavaScript only |

**The logs you're looking for are SERVER LOGS, not browser console logs!**

---

## 🔍 Method 1: Hostinger Control Panel (Easiest)

### Step-by-Step:

1. **Login to Hostinger**
   - Go to: https://hpanel.hostinger.com
   - Enter your credentials

2. **Navigate to Your Application**
   - Click: **Hosting** (left sidebar)
   - Select: Your website
   - Click: **Manage**

3. **Access Application Logs**
   - Option A: Click **Node.js Application** → **Logs**
   - Option B: Click **Files** → **File Manager** → Look for log files
   - Option C: Click **Advanced** → **Application Logs**

4. **View Real-Time Logs**
   - Look for the latest entries
   - Search for these keywords:
     - `🚀 Starting Server`
     - `✅ Loaded env from`
     - `>> Hostinger Assigned Port`
     - `✅ Server Ready on`

### Example Log Output You Should See:

```
[2026-01-01 10:15:23] 🚀 Starting Server...
[2026-01-01 10:15:23] ✅ Loaded env from: .env.production
[2026-01-01 10:15:23] >> Hostinger Assigned Port: 12345
[2026-01-01 10:15:23] >> Final Binding Port: 12345
[2026-01-01 10:15:25] ✅ Next.js app prepared successfully
[2026-01-01 10:15:25] 
[2026-01-01 10:15:25] ============================================================
[2026-01-01 10:15:25] ✅ Server Ready on http://0.0.0.0:12345
[2026-01-01 10:15:25] ✅ Socket.IO initialized on /api/widget/socket
[2026-01-01 10:15:25] ✅ Environment: PRODUCTION
[2026-01-01 10:15:25] ✅ CORS enabled for: https://your-domain.com
[2026-01-01 10:15:25] ============================================================
```

---

## 🔍 Method 2: SSH Access (Advanced)

If you have SSH enabled:

```bash
# Connect to your server
ssh your-username@your-server-ip

# Navigate to application directory
cd /path/to/your/app

# View real-time logs
tail -f application.log

# Or if using PM2
pm2 logs wzatco-helpdesk

# View last 100 lines
pm2 logs --lines 100
```

---

## 🔍 Method 3: File Manager Logs

### Via Hostinger File Manager:

1. Go to **File Manager** in Hostinger panel
2. Navigate to your application root
3. Look for log files:
   - `application.log`
   - `output.log`
   - `error.log`
   - `stdout.log`
   - `pm2.log`
4. Right-click → **View** or **Download**

---

## 🌐 Alternative: Verify Without Logs

If you can't find the logs, verify deployment is working:

### 1. Check Homepage
```
Visit: https://your-domain.com
Status: ✅ Should load without errors
```

### 2. Check API Endpoint
Open browser console on your site:
```javascript
fetch('/api/health')
  .then(r => r.json())
  .then(data => console.log('API Status:', data))
```

### 3. Check Socket.IO
In browser console on your site:
```javascript
// Should see in Network tab (WebSocket section):
ws://your-domain.com/api/widget/socket
Status: 101 Switching Protocols (successful upgrade)
```

### 4. Check Network Tab
- Open DevTools (F12)
- Go to **Network** tab
- Reload page
- Look for:
  - ✅ Status 200 for main page
  - ✅ Status 200 for API calls
  - ✅ Status 101 for WebSocket upgrade

---

## 🐛 Troubleshooting: Can't Find Logs

### Issue 1: No Logs Tab in Hostinger

**Solution:**
- Some Hostinger plans don't show logs in UI
- Use File Manager method instead
- Contact Hostinger support to enable log access

### Issue 2: Empty Log Files

**Solution:**
```bash
# Check if application is running
# In Hostinger panel: Node.js Application → Status
# Should show: Running ✅

# If not running, restart:
# Click "Restart Application"
```

### Issue 3: Logs Show Old Data

**Solution:**
- Clear browser cache
- Refresh the logs page
- Check the timestamp of entries
- Trigger a new deployment:
  ```bash
  git commit --allow-empty -m "Trigger rebuild"
  git push origin main
  ```

---

## 📊 What Logs Tell You

### Successful Startup Indicators:

| Log Entry | What It Means |
|-----------|---------------|
| `🚀 Starting Server...` | Server initialization began |
| `✅ Loaded env from: .env.production` | Environment variables loaded |
| `>> Hostinger Assigned Port: 12345` | Hostinger provided a port |
| `>> Final Binding Port: 12345` | Server using correct port |
| `✅ Next.js app prepared successfully` | Next.js compiled and ready |
| `✅ Server Ready on http://0.0.0.0:12345` | Server listening for requests |
| `✅ Socket.IO initialized` | WebSocket ready |

### Error Indicators:

| Log Entry | What It Means | Action |
|-----------|---------------|--------|
| `❌ FATAL ERROR: Server failed to start` | Server crash | Check error details below |
| `Module not found` | Missing dependency | Check package.json |
| `EADDRINUSE` | Port conflict | Restart application |
| `Cannot find module 'dotenv'` | Missing dependency | Rebuild with correct package.json |

---

## 🎯 Quick Access Checklist

- [ ] Logged into Hostinger Control Panel
- [ ] Navigated to: Hosting → Manage → Application Logs
- [ ] Found startup logs with emoji indicators (🚀, ✅)
- [ ] Verified port assignment (>> Hostinger Assigned Port)
- [ ] Confirmed server ready message (✅ Server Ready on...)
- [ ] Checked Socket.IO initialization
- [ ] No error messages (❌) present

---

## 📞 Still Can't Find Logs?

### Contact Hostinger Support

**What to Ask:**
```
Hello, I need help accessing server logs for my Node.js application.
I've deployed a Next.js app and need to see the startup logs.

My account: [your-email]
Domain: [your-domain.com]
Plan: [your-hosting-plan]

Question: Where can I view the Node.js application console output 
and startup logs?
```

### Alternative: Add Custom Logging

If server logs aren't accessible, add a health endpoint:

**Create:** `pages/api/server-status.js`
```javascript
export default function handler(req, res) {
  res.status(200).json({
    status: 'running',
    environment: process.env.NODE_ENV,
    port: process.env.PORT || 'not set',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
```

**Access:** `https://your-domain.com/api/server-status`

---

## ✅ Summary

**Remember:**
- 🖥️ Server logs = Hostinger Control Panel
- 🌐 Browser console = Client-side only
- 📊 Use both to fully monitor your application

**Server logs show:** Startup, port binding, environment loading  
**Browser console shows:** React rendering, API calls, user interactions

---

**End of Guide**

