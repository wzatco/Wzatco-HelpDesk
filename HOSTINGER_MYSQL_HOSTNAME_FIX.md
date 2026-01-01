# Hostinger MySQL Database URL Fix

**Date:** January 1, 2026  
**Issue:** DATABASE_URL using localhost - won't work on cloud  
**Status:** NEEDS UPDATE

---

## 🐛 Current Configuration (WRONG for Cloud)

```bash
DATABASE_URL="mysql://u394742293_HD_demo:Rohan_1025@localhost:3306/u394742293_HD_demo"
                                                        ^^^^^^^^^ 
                                                        Problem: localhost
```

**Why this fails:**
- `localhost` refers to the Node.js server's local machine
- Your MySQL database is on a different Hostinger server
- They can't connect via `localhost`

---

## ✅ Solution: Get Correct Hostinger Database Hostname

### Step 1: Find Your Database Hostname

1. **Login to Hostinger Control Panel**
   - Go to: https://hpanel.hostinger.com

2. **Navigate to Databases**
   - Click: **Websites** → Your Site
   - Click: **Databases** (left sidebar)
   - Or: **Advanced** → **MySQL Databases**

3. **Find Database Details**
   Look for your database: `u394742293_HD_demo`
   
   You'll see:
   ```
   Database Name: u394742293_HD_demo
   Username: u394742293_HD_demo
   Host: <---- THIS IS WHAT YOU NEED
   Port: 3306
   ```

### Step 2: Common Hostinger Database Hostnames

Hostinger typically uses one of these formats:

**Format 1: Server-specific hostname**
```
mysql123.hostinger.com
```

**Format 2: Same as web server**
```
srv123456.hstgr.cloud
```

**Format 3: Internal hostname**
```
127.0.0.1 (if database is on same physical server)
mysql.yourdomain.com (if using remote MySQL)
```

### Step 3: Update DATABASE_URL

Once you have the hostname, update it in Hostinger Environment Variables:

**Example (replace `CORRECT_HOSTNAME` with actual hostname):**

```bash
DATABASE_URL="mysql://u394742293_HD_demo:Rohan_1025@CORRECT_HOSTNAME:3306/u394742293_HD_demo"
```

**Real Examples:**

```bash
# If hostname is mysql123.hostinger.com:
DATABASE_URL="mysql://u394742293_HD_demo:Rohan_1025@mysql123.hostinger.com:3306/u394742293_HD_demo"

# If hostname is srv123456.hstgr.cloud:
DATABASE_URL="mysql://u394742293_HD_demo:Rohan_1025@srv123456.hstgr.cloud:3306/u394742293_HD_demo"

# If using 127.0.0.1 (rare):
DATABASE_URL="mysql://u394742293_HD_demo:Rohan_1025@127.0.0.1:3306/u394742293_HD_demo"
```

### Step 4: Restart Application

After updating DATABASE_URL:

1. Go to: **Node.js Application**
2. Click: **Restart Application**
3. Wait 30 seconds

---

## 🔍 How to Find Your Database Hostname

### Method 1: Hostinger Panel (Easiest)

```
Hostinger Panel
  → Websites → Your Site
  → Databases
  → MySQL Databases
  → Find your database
  → Look for "Hostname" or "Host" field
```

### Method 2: Contact Hostinger Support

If you can't find the hostname:

**Ask Hostinger Support:**
```
Hello, I need the MySQL database hostname for:

Database name: u394742293_HD_demo
Username: u394742293_HD_demo

I'm deploying a Node.js application and need the hostname 
to connect to the database remotely.

Is it:
- localhost
- 127.0.0.1
- mysql.hostinger.com
- srv[number].hstgr.cloud
- Or something else?

Thank you!
```

### Method 3: Check phpMyAdmin URL

1. Go to Hostinger → Databases → **phpMyAdmin**
2. Look at the phpMyAdmin URL
3. Often contains the database server hostname

---

## 🧪 Test Database Connection

### Option 1: Using API Endpoint

After updating DATABASE_URL and restarting:

```
Visit: https://your-domain.com/api/server-status
```

Should show:
```json
{
  "status": "running",
  "environment": "production"
}
```

### Option 2: Test Knowledge Base API

```
Visit: https://your-domain.com/api/public/knowledge-base/categories
```

**If working:**
```json
{
  "success": true,
  "categories": []
}
```

**If still failing:**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## 📝 Common Hostinger Database Hostname Patterns

Based on Hostinger's typical setup:

| Hosting Type | Typical Hostname |
|-------------|------------------|
| Shared Hosting | `localhost` or `127.0.0.1` (database on same server) |
| Cloud Hosting | `mysql123.hostinger.com` or `srv123.hstgr.cloud` |
| VPS Hosting | Custom IP or hostname you configured |
| Business Hosting | `mysql.yourdomain.com` (if configured) |

---

## 🎯 Quick Reference

### Current (Wrong):
```bash
DATABASE_URL="mysql://u394742293_HD_demo:Rohan_1025@localhost:3306/u394742293_HD_demo"
```

### Fixed (Example - replace hostname):
```bash
DATABASE_URL="mysql://u394742293_HD_demo:Rohan_1025@mysql123.hostinger.com:3306/u394742293_HD_demo"
```

### Format Breakdown:
```
mysql://     [username]   :   [password]   @ [hostname] : [port] / [database]
mysql:// u394742293_HD_demo : Rohan_1025    @ mysql123   : 3306  / u394742293_HD_demo
```

---

## ⚠️ Security Note

**Your password is visible in the screenshot:**
```
Password: Rohan_1025
```

**Recommendation:**
- Change this password after fixing the connection
- Use a stronger password with special characters
- Never commit credentials to Git

---

## ✅ Success Checklist

After updating DATABASE_URL:

- [ ] Found correct database hostname from Hostinger panel
- [ ] Updated DATABASE_URL in Environment Variables
- [ ] Replaced `localhost` with actual hostname
- [ ] Restarted Node.js application
- [ ] Tested API endpoint: `/api/server-status`
- [ ] Tested Knowledge Base API (no 500 errors)
- [ ] Homepage loads without errors

---

## 🚀 Next Steps

1. **Find your database hostname** in Hostinger panel
2. **Update DATABASE_URL** with correct hostname
3. **Restart application**
4. **Test** by visiting your site

The 500 errors should disappear once the database connection is properly configured!

---

**End of Fix Guide**

