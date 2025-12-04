# Role Access Control Implementation Guide

## 🔒 Security Implementation Overview

This guide explains how to implement and enforce role-based access control throughout your application. The role access matrix in the admin panel stores permissions in the database, but you must enforce them in both frontend and backend.

---

## 📋 Table of Contents

1. [Backend API Protection](#backend-api-protection)
2. [Frontend Page Protection](#frontend-page-protection)
3. [Component-Level Protection](#component-level-protection)
4. [Complete Implementation Checklist](#complete-implementation-checklist)

---

## 🛡️ Backend API Protection

### Step 1: Protect Your API Endpoints

Every API endpoint that performs sensitive operations must check permissions.

#### Method A: Using `checkPermissionOrFail` (Recommended)

```javascript
import { checkPermissionOrFail } from '../../../lib/permissions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Get user ID from your authentication system
  const userId = req.session?.userId || req.headers['x-user-id'];

  if (req.method === 'GET') {
    // Check permission
    const hasAccess = await checkPermissionOrFail(
      userId,
      'admin.tickets', // Permission name from your role access matrix
      res
    );

    if (!hasAccess) {
      return; // Error response already sent
    }

    // User has permission, continue with your logic
    const tickets = await prisma.conversation.findMany();
    res.status(200).json({ success: true, tickets });
  }

  // ... handle other methods
}
```

#### Method B: Using `requirePermission` Middleware

```javascript
import { requirePermission } from '../../../lib/permissions';

export default async function handler(req, res) {
  const userId = req.session?.userId || req.headers['x-user-id'];
  
  // Check permission
  const middleware = requirePermission('admin.tickets');
  const canProceed = await middleware(req, res, null);
  
  if (!canProceed) {
    return; // Error response already sent
  }

  // Your logic here
}
```

#### Method C: Checking Multiple Permissions

```javascript
import { hasAllPermissions, hasAnyPermission } from '../../../lib/permissions';

export default async function handler(req, res) {
  const userId = req.session?.userId;

  // Check if user has ALL specified permissions
  const hasAll = await hasAllPermissions(userId, [
    'admin.tickets',
    'admin.tickets.edit'
  ]);

  // Check if user has ANY of the specified permissions
  const hasAny = await hasAnyPermission(userId, [
    'admin.tickets',
    'admin.reports'
  ]);

  if (!hasAll) {
    return res.status(403).json({ 
      success: false, 
      message: 'Insufficient permissions' 
    });
  }

  // Your logic here
}
```

---

## 🎨 Frontend Page Protection

### Step 1: Protect Entire Pages

Use the `usePageAccess` hook to protect entire admin pages:

```javascript
import { usePageAccess } from '../../../hooks/usePermissions';
import { useEffect, useState } from 'react';

export default function TicketsPage() {
  const [userId, setUserId] = useState(null);

  // Get user ID from your auth context/session
  useEffect(() => {
    // Replace with your actual authentication method
    const user = getCurrentUser();
    setUserId(user?.id);
  }, []);

  // Protect the page
  const { hasAccess, loading } = usePageAccess(
    'admin.tickets', // Permission name
    userId,
    '/admin/unauthorized' // Redirect URL if no access
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!hasAccess) {
    return null; // Will redirect automatically
  }

  return (
    <div>
      {/* Your page content */}
      <h1>Tickets</h1>
    </div>
  );
}
```

### Step 2: Using the Permission Hook

For more granular control:

```javascript
import usePermissions from '../../../hooks/usePermissions';

export default function TicketsPage() {
  const [userId, setUserId] = useState(null);
  const { hasPermission, hasAnyPermission, isSuperAdmin, loading } = usePermissions(userId);

  if (loading) {
    return <div>Loading...</div>;
  }

  // Check single permission
  if (!hasPermission('admin.tickets')) {
    return <div>Access Denied</div>;
  }

  return (
    <div>
      <h1>Tickets</h1>
      
      {/* Conditionally show elements based on permissions */}
      {hasPermission('admin.tickets.create') && (
        <button>Create Ticket</button>
      )}

      {hasPermission('admin.tickets.delete') && (
        <button>Delete Ticket</button>
      )}

      {isSuperAdmin && (
        <div>Super Admin Only Content</div>
      )}
    </div>
  );
}
```

---

## 🧩 Component-Level Protection

### Using PermissionGuard Component

Wrap components that should only be visible to users with specific permissions:

```javascript
import { PermissionGuard } from '../../../hooks/usePermissions';

export default function TicketsPage({ userId }) {
  return (
    <div>
      <h1>Tickets</h1>

      {/* Only show to users with create permission */}
      <PermissionGuard
        requiredPermission="admin.tickets.create"
        userId={userId}
        fallback={<div>You cannot create tickets</div>}
      >
        <CreateTicketButton />
      </PermissionGuard>

      {/* Only show to users with delete permission */}
      <PermissionGuard
        requiredPermission="admin.tickets.delete"
        userId={userId}
        fallback={null}
      >
        <DeleteTicketButton />
      </PermissionGuard>
    </div>
  );
}
```

---

## ✅ Complete Implementation Checklist

### Backend API Routes to Protect

- [ ] `/api/admin/tickets/*` - Require `admin.tickets` permission
- [ ] `/api/admin/tickets/[id]` (POST/PATCH) - Require `admin.tickets.edit`
- [ ] `/api/admin/tickets/[id]` (DELETE) - Require `admin.tickets.delete`
- [ ] `/api/admin/agents/*` - Require `admin.agents` permission
- [ ] `/api/admin/agents/[id]` (POST/PATCH) - Require `admin.agents.edit`
- [ ] `/api/admin/departments/*` - Require `admin.departments` permission
- [ ] `/api/admin/products/*` - Require `admin.products` permission
- [ ] `/api/admin/reports/*` - Require `admin.reports` permission
- [ ] `/api/admin/settings/*` - Require `admin.settings` permission
- [ ] `/api/admin/roles/*` - Require `admin.roles` permission
- [ ] `/api/admin/integrations/*` - Require `admin.integrations` permission
- [ ] `/api/admin/knowledge-base/*` - Require `admin.knowledge-base` permission

### Frontend Pages to Protect

- [ ] `/admin/tickets` - Require `admin.tickets` permission
- [ ] `/admin/tickets/new` - Require `admin.tickets.create` permission
- [ ] `/admin/tickets/[id]` - Require `admin.tickets.edit` permission
- [ ] `/admin/agents` - Require `admin.agents` permission
- [ ] `/admin/agents/new` - Require `admin.agents.create` permission
- [ ] `/admin/agents/[id]` - Require `admin.agents.edit` permission
- [ ] `/admin/departments` - Require `admin.departments` permission
- [ ] `/admin/products` - Require `admin.products` permission
- [ ] `/admin/reports/*` - Require appropriate `admin.reports.*` permissions
- [ ] `/admin/settings/*` - Require `admin.settings` permission
- [ ] `/admin/roles` - Require `admin.roles` permission
- [ ] `/admin/role-access` - Require `admin.roles` permission
- [ ] `/admin/integrations` - Require `admin.integrations` permission
- [ ] `/admin/knowledge-base` - Require `admin.knowledge-base` permission

### UI Components to Conditionally Render

- [ ] Create/Edit buttons - Check create/edit permissions
- [ ] Delete buttons - Check delete permissions
- [ ] Navigation menu items - Only show accessible pages
- [ ] Action buttons in tables - Check relevant permissions
- [ ] Settings tabs - Only show accessible sections

---

## 🔧 Authentication Integration

### Step 1: Implement Session Management

You need to implement proper session management to get the current user ID. This guide assumes you'll use one of these methods:

#### Option A: JWT Tokens (Recommended)

```javascript
import jwt from 'jsonwebtoken';

// After successful login
export default async function loginHandler(req, res) {
  // ... validate credentials ...
  
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '48h' }
  );

  res.status(200).json({
    success: true,
    token,
    user: { id: user.id, name: user.name, email: user.email }
  });
}

// Middleware to verify token
export function getUserFromToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    return null;
  }
}
```

#### Option B: Express Sessions

```javascript
import session from 'express-session';

// Configure session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 48 * 60 * 60 * 1000 } // 48 hours
}));

// After successful login
req.session.userId = user.id;

// In API handlers
const userId = req.session.userId;
```

### Step 2: Create Auth Context (Frontend)

```javascript
// contexts/AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from localStorage/session
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and load user
      fetch('/api/admin/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUser(data.user);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

---

## 🚀 Quick Start Implementation

### 1. Update Your Login API to Return User ID

```javascript
// pages/api/admin/auth/login.js
res.status(200).json({
  success: true,
  token: jwtToken,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    roleId: user.roleId
  }
});
```

### 2. Store User ID in Frontend

```javascript
// After successful login
localStorage.setItem('token', data.token);
localStorage.setItem('userId', data.user.id);
```

### 3. Protect Your First API Endpoint

```javascript
// pages/api/admin/tickets/index.js
import { checkPermissionOrFail } from '../../../lib/permissions';

export default async function handler(req, res) {
  const userId = req.headers['x-user-id'] || localStorage.getItem('userId');
  
  const hasAccess = await checkPermissionOrFail(userId, 'admin.tickets', res);
  if (!hasAccess) return;

  // Your existing code...
}
```

### 4. Protect Your First Page

```javascript
// pages/admin/tickets/index.js
import { usePageAccess } from '../../../hooks/usePermissions';

export default function TicketsPage() {
  const userId = localStorage.getItem('userId');
  const { hasAccess, loading } = usePageAccess('admin.tickets', userId);

  if (loading) return <div>Loading...</div>;
  if (!hasAccess) return null;

  // Your existing code...
}
```

---

## 📊 Available Permission Names

All permissions are stored in `/pages/api/admin/roles/[id]/permissions.js`:

- `admin.dashboard`
- `admin.tickets`
- `admin.tickets.create`
- `admin.tickets.edit`
- `admin.tickets.delete`
- `admin.agents`
- `admin.agents.create`
- `admin.agents.edit`
- `admin.agents.delete`
- `admin.departments`
- `admin.products`
- `admin.knowledge-base`
- `admin.reports`
- `admin.reports.overview`
- `admin.reports.performance`
- `admin.reports.sla`
- `admin.reports.agents`
- `admin.reports.customers`
- `admin.widgets`
- `admin.integrations`
- `admin.ticket-templates`
- `admin.escalation-rules`
- `admin.assignment-rules`
- `admin.roles`
- `admin.settings`
- `admin.users`
- `admin.worklog`
- `admin.notifications`
- `admin.profile`

---

## ⚠️ Important Security Notes

1. **Never trust frontend checks alone** - Always enforce permissions on the backend
2. **Use HTTPS in production** - Protect tokens and sessions
3. **Implement proper session management** - Use secure, httpOnly cookies or JWT
4. **Log permission denials** - Track unauthorized access attempts
5. **Test thoroughly** - Verify each role can only access permitted resources
6. **Super Admin bypass** - Users with `hasSuperPower` automatically have all permissions

---

## 🧪 Testing Your Implementation

### Test Checklist

1. **Create test roles** with different permission combinations
2. **Test each API endpoint** with different roles
3. **Verify frontend hiding** of unauthorized elements
4. **Test direct URL access** to protected pages
5. **Check API responses** return 403 for unauthorized requests
6. **Verify Super Admin** has access to everything

---

## 📞 Support

If you need help implementing role-based access control, refer to:
- `lib/permissions.js` - Backend permission utilities
- `hooks/usePermissions.js` - Frontend permission hooks
- `pages/api/admin/tickets/protected-example.js` - Complete API example

**Remember**: The role access matrix in the admin panel is only step 1. You must implement permission checking in both frontend and backend for complete security! 🔒

