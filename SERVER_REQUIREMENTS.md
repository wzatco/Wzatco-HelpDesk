# 📋 Next.js Application - Server Requirements

## ✅ **CRITICAL REQUIREMENTS**

### **1. Node.js Runtime** ⭐
**Required:** Node.js v18.17 or higher (v20+ recommended)

```bash
# Check your Node.js version:
node --version

# Required: v18.17.0 or higher
# Recommended: v20.x or v22.x
```

**Why:** 
- Next.js 15.5.6 requires Node.js 18.17+
- React 19.2 needs modern Node.js features
- Your app uses ES modules and modern JavaScript

---

### **2. Database** ⭐
**Required:** MySQL 5.7+ or MySQL 8.0+

```bash
# Your current setup:
Database: MySQL 8.0
Host: 82.180.140.4:3306
Database Name: u394742293_HD_demo
```

**Supported Databases:**
- ✅ **MySQL** 5.7+ (your current choice)
- ✅ **PostgreSQL** 12+
- ✅ **MariaDB** 10.3+
- ❌ **SQLite** (development only, not production)

**Database Connection Requirements:**
- ✅ Remote connections allowed
- ✅ Port 3306 accessible
- ✅ User with CREATE, SELECT, INSERT, UPDATE, DELETE permissions

---

### **3. Memory Requirements**
**Minimum:** 512 MB RAM
**Recommended:** 1 GB+ RAM

**Why:**
```json
"dev": "node --max-old-space-size=4096 server.js"
```
Your app allocates up to 4GB for development (production uses less)

---

## ❌ **NOT REQUIRED**

### **PHP** - NOT NEEDED! ❌
**Your application is 100% JavaScript/Node.js**
- ❌ No PHP required
- ❌ No Apache required
- ❌ No PHP extensions needed

**This is NOT a PHP application!**

---

## 📊 **COMPLETE REQUIREMENTS LIST**

### **Runtime Environment:**

| Requirement | Version | Status |
|------------|---------|--------|
| **Node.js** | v18.17+ (v20+ recommended) | ⭐ **CRITICAL** |
| **npm** | v9.0+ (comes with Node) | ⭐ **CRITICAL** |
| **MySQL** | 5.7+ or 8.0+ | ⭐ **CRITICAL** |
| **PHP** | ❌ NOT REQUIRED | Not needed |
| **Apache** | ❌ NOT REQUIRED | Not needed |

---

### **Node.js Packages (Automatically Installed):**

**Production Dependencies:** (79 packages)
- Next.js 15.5.6
- React 19.2.0
- Prisma 6.19.1 (Database ORM)
- Socket.IO 4.8.1 (Real-time)
- Tailwind CSS 3.4.18
- And 74 more...

**These install automatically with `npm install`**

---

### **Server Capabilities Required:**

#### **1. Port Access:**
```
✅ HTTP/HTTPS ports (80/443)
✅ Custom port (e.g., 3000) - for Node.js
✅ MySQL port (3306) - for database
```

#### **2. File System:**
```
✅ Read/Write access to application directory
✅ Create temporary files
✅ Upload directory access (for file uploads)
```

#### **3. Network:**
```
✅ Outbound connections (for APIs, email, etc.)
✅ WebSocket support (for Socket.IO)
✅ HTTPS/SSL support
```

#### **4. Process Management:**
```
✅ Long-running processes (Node.js server)
✅ Process restart on crash
✅ Environment variables support
```

---

## 🔧 **Hostinger-Specific Requirements**

### **What Hostinger Must Support:**

#### **✅ Required Features:**
1. **Node.js Hosting** (not PHP hosting)
   - Node.js v18.17+ runtime
   - npm package installation
   - Custom Node.js startup command

2. **Environment Variables**
   - Ability to set 15+ environment variables
   - Support for DATABASE_URL, JWT_SECRET, etc.

3. **Database Access**
   - MySQL database included or external
   - Remote database connection support
   - Port 3306 accessible

4. **Build Process**
   - Run `npm install` on deploy
   - Run `npm run build` on deploy
   - Run `prisma generate` (automatic via postinstall)

5. **Custom Server**
   - Your app uses `server.js` (custom Next.js server)
   - Needs to run: `node server.js`
   - Not the default Next.js server

---

## 📝 **Hostinger Setup Requirements**

### **Application Configuration:**

```yaml
# Hostinger should be configured as:
Type: Node.js Application (NOT PHP)
Node Version: 18.17+ or 20.x
Entry Point: server.js
Build Command: npm install && npm run build
Start Command: npm start
Port: 3000 (or auto-assigned)
```

### **Required Environment Variables:**
```
DATABASE_URL          ⭐ Critical
JWT_SECRET            ⭐ Critical
NEXTAUTH_SECRET       ⭐ Critical
NEXT_PUBLIC_BASE_URL  ⭐ Critical
NODE_ENV=production   ⭐ Critical
PORT=3000             ✅ Recommended
+ 9 email variables   ✅ Optional
```

---

## 🚫 **Common Misconceptions**

### **What This Application is NOT:**

❌ **NOT a PHP Application**
- No PHP code
- No .php files
- No WordPress, Laravel, etc.

❌ **NOT a Static Site**
- Requires Node.js server running
- Not just HTML/CSS/JS files
- Needs database connection

❌ **NOT Apache-based**
- Uses Node.js HTTP server
- No .htaccess files
- No Apache modules needed

---

## ✅ **What This Application IS:**

### **Technology Stack:**

```
Frontend:
├── Next.js 15.5.6 (React Framework)
├── React 19.2.0
├── Tailwind CSS 3.4.18
└── Socket.IO Client 4.8.1

Backend:
├── Node.js (Custom Server)
├── Next.js API Routes
├── Prisma ORM 6.19.1
├── Socket.IO Server 4.8.1
└── MySQL Database

Authentication:
├── NextAuth.js 4.24.13
├── JWT (jsonwebtoken)
└── bcryptjs

Email:
└── Nodemailer 7.0.10 (AWS SES)
```

---

## 🔍 **How to Verify Hostinger Compatibility**

### **Check These in Hostinger Dashboard:**

1. **Hosting Type:**
   ```
   ✅ Node.js Hosting
   ✅ Cloud Hosting with Node.js
   ✅ VPS with Node.js installed
   
   ❌ PHP Hosting (won't work!)
   ❌ WordPress Hosting (won't work!)
   ❌ Static Site Hosting (won't work!)
   ```

2. **Node.js Version:**
   ```bash
   # Must support Node.js 18.17+
   # Check in dashboard or via SSH:
   node --version
   ```

3. **Database:**
   ```
   ✅ MySQL included or
   ✅ Can connect to external MySQL
   ```

4. **Environment Variables:**
   ```
   ✅ Has "Environment Variables" section
   ✅ Can set custom variables
   ```

---

## 📋 **Pre-Deployment Checklist**

Before deploying to Hostinger, verify:

### **Hostinger Plan Requirements:**
- [ ] Supports **Node.js** applications
- [ ] Node.js version **18.17+** available
- [ ] **MySQL database** included or accessible
- [ ] Can set **environment variables**
- [ ] Supports **custom start commands**
- [ ] Has **512MB+ RAM** available
- [ ] Supports **WebSocket** connections (for Socket.IO)

### **Your Setup:**
- [x] Code pushed to Git repository
- [x] `package.json` has correct scripts
- [x] `server.js` configured for production
- [x] Environment variables prepared (15 variables)
- [x] Database migrated to MySQL
- [x] Prisma schema configured for MySQL

---

## 🎯 **Quick Answer to Your Question:**

**Q: Does your Next.js application require specific database type, PHP version, or others?**

**A: Requirements:**

### **✅ REQUIRED:**
1. **Node.js** v18.17+ (v20+ recommended) ⭐
2. **MySQL** 5.7+ or 8.0+ ⭐
3. **npm** (comes with Node.js) ⭐
4. **512MB+ RAM** ⭐
5. **Environment Variables Support** ⭐

### **❌ NOT REQUIRED:**
1. **PHP** - Not needed at all! ❌
2. **Apache** - Not needed! ❌
3. **PHP Extensions** - Not applicable! ❌
4. **.htaccess** - Not used! ❌

### **✅ OPTIONAL:**
1. **WebSocket Support** (for Socket.IO)
2. **SMTP Access** (for email)
3. **SSL/HTTPS** (recommended)

---

## 🚀 **Summary:**

Your application is:
- **100% Node.js/JavaScript** (no PHP!)
- **Requires MySQL database** (5.7+ or 8.0+)
- **Requires Node.js 18.17+** runtime
- **Requires environment variables** (15 variables)
- **Does NOT need PHP, Apache, or PHP extensions**

**Make sure Hostinger plan supports Node.js hosting, not PHP hosting!**

---

**Date:** 2026-01-01
**Application:** AdminNAgent (Next.js 15 + React 19 + MySQL)
**Stack:** Node.js + Next.js + Prisma + MySQL + Socket.IO

