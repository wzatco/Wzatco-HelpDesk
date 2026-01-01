# Profile Data Inspection Report

## Overview
This document lists all available profile fields for **Admin** and **Agent** models based on the Prisma schema and current implementation.

---

## 📋 Admin Profile Fields

### From `prisma/schema.prisma` (Admin Model - Lines 231-250):

| Field | Type | Required | Description | Currently Used |
|-------|------|----------|-------------|----------------|
| `id` | String | ✅ | Unique identifier | ✅ |
| `name` | String | ✅ | Full name | ✅ |
| `email` | String? | ❌ | Email address (unique) | ✅ |
| `phone` | String? | ❌ | Phone number | ✅ |
| `role` | String? | ❌ | Role title (default: "Admin") | ✅ |
| `avatarUrl` | String? | ❌ | Profile picture URL | ✅ |
| `bio` | String? | ❌ | Biography/About section | ✅ |
| `address` | String? | ❌ | Street address | ✅ |
| `city` | String? | ❌ | City | ✅ |
| `state` | String? | ❌ | State/Province | ✅ |
| `country` | String? | ❌ | Country | ✅ |
| `postal` | String? | ❌ | Postal/ZIP code | ✅ |
| `timezone` | String? | ❌ | Timezone (default: "Asia/Kolkata") | ✅ |
| `notifyEmail` | Boolean | ❌ | Email notifications (default: true) | ✅ |
| `notifyPush` | Boolean | ❌ | Push notifications (default: true) | ✅ |
| `password` | String? | ❌ | Password hash | ❌ (not in profile page) |
| `createdAt` | DateTime | ✅ | Account creation date | ❌ |
| `updatedAt` | DateTime | ✅ | Last update timestamp | ❌ |

### Currently Displayed in `pages/admin/profile/index.js`:
- ✅ All fields above (except `password`, `createdAt`, `updatedAt`)
- ✅ Avatar upload/removal functionality
- ✅ Form validation and save functionality

---

## 👤 Agent Profile Fields

### From `prisma/schema.prisma` (Agent Model - Lines 59-88):

| Field | Type | Required | Description | Currently Used |
|-------|------|----------|-------------|----------------|
| `id` | String | ✅ | Unique identifier | ✅ |
| `userId` | String? | ❌ | Linked User account ID | ❌ |
| `accountId` | String? | ❌ | Linked User account ID (alternative) | ❌ |
| `name` | String | ✅ | Full name | ✅ |
| `email` | String? | ❌ | Email address (unique) | ✅ |
| `slug` | String | ✅ | URL-friendly identifier (unique) | ✅ |
| `departmentId` | String? | ❌ | Department reference | ✅ |
| `roleId` | String? | ❌ | Role reference | ✅ |
| `skills` | String? | ❌ | Skills/Expertise | ❌ |
| `isActive` | Boolean | ❌ | Active status (default: true) | ✅ |
| `maxLoad` | Int? | ❌ | Maximum ticket load | ❌ |
| `presenceStatus` | String | ❌ | Online/Offline/Away (default: "offline") | ✅ |
| `lastSeenAt` | DateTime? | ❌ | Last activity timestamp | ✅ |
| `createdAt` | DateTime | ✅ | Account creation date | ❌ |
| `updatedAt` | DateTime | ✅ | Last update timestamp | ❌ |

### From `prisma/schema.prisma` (User Model - Lines 90-109):
**Note:** Agents can have a linked `User` account via `accountId` relation.

| Field | Type | Required | Description | Available via Agent |
|-------|------|----------|-------------|---------------------|
| `id` | String | ✅ | User ID | ✅ (via `agent.account.id`) |
| `name` | String | ✅ | Full name | ✅ (via `agent.account.name`) |
| `email` | String | ✅ | Email (unique) | ✅ (via `agent.account.email`) |
| `phone` | String? | ❌ | Phone number | ✅ (via `agent.account.phone`) |
| `avatarUrl` | String? | ❌ | Profile picture URL | ✅ (via `agent.account.avatarUrl`) |
| `password` | String? | ❌ | Password hash | ❌ |
| `passwordResetToken` | String? | ❌ | Reset token | ❌ |
| `passwordResetExpiry` | DateTime? | ❌ | Token expiry | ❌ |
| `status` | String | ❌ | Account status (default: "active") | ✅ (via `agent.account.status`) |
| `type` | String | ❌ | User type (default: "agent") | ✅ (via `agent.account.type`) |
| `roleId` | String? | ❌ | Role reference | ✅ (via `agent.account.roleId`) |
| `createdAt` | DateTime | ✅ | Account creation date | ✅ (via `agent.account.createdAt`) |
| `updatedAt` | DateTime | ✅ | Last update timestamp | ✅ (via `agent.account.updatedAt`) |

### Relations Available:
- `department` → Department object (name, description, etc.)
- `role` → Role object (title, displayAs, hasSuperPower, etc.)
- `account` → User object (phone, avatarUrl, etc.)

### Currently Returned in `pages/api/agent/profile.js`:
```javascript
{
  id: agent.id,
  name: agent.name,
  email: agent.email || agent.account?.email,
  slug: agent.slug,
  avatarUrl: agent.account?.avatarUrl,
  department: agent.department,
  role: agent.role,
  isActive: agent.isActive,
  presenceStatus: agent.presenceStatus,
  lastSeenAt: agent.lastSeenAt
}
```

### Missing Fields (Available but Not Currently Used):
- ❌ `skills` (Agent model)
- ❌ `maxLoad` (Agent model)
- ❌ `phone` (from User account)
- ❌ `bio` (not in schema - would need to be added)
- ❌ `address`, `city`, `state`, `country`, `postal` (not in schema - would need to be added)
- ❌ `timezone` (not in schema - would need to be added)
- ❌ `notifyEmail`, `notifyPush` (not in schema - would need to be added)

---

## 🔍 Comparison: Admin vs Agent

| Feature | Admin | Agent |
|---------|-------|-------|
| **Basic Info** | ✅ name, email, phone | ✅ name, email, phone (via User) |
| **Avatar** | ✅ avatarUrl | ✅ avatarUrl (via User) |
| **Bio** | ✅ bio | ❌ Not available |
| **Address** | ✅ Full address fields | ❌ Not available |
| **Timezone** | ✅ timezone | ❌ Not available |
| **Notifications** | ✅ notifyEmail, notifyPush | ❌ Not available |
| **Role** | ✅ role (string) | ✅ role (object via relation) |
| **Department** | ❌ Not available | ✅ department (object via relation) |
| **Skills** | ❌ Not available | ✅ skills (string) |
| **Presence** | ❌ Not available | ✅ presenceStatus, lastSeenAt |
| **Max Load** | ❌ Not available | ✅ maxLoad (int) |

---

## 📝 Recommendations for Zoho-like Profile Redesign

### For Admin Profile:
**Current fields are comprehensive.** Consider adding:
- Job title/position (could use `role` field)
- Extension/Internal phone (could use a new field or repurpose `phone`)
- Employee ID (could use `id` or add new field)
- Manager/Supervisor reference (would need new relation)

### For Agent Profile:
**Needs significant expansion.** Recommended additions:

1. **Personal Information:**
   - ✅ `phone` (from User account - already available)
   - ✅ `avatarUrl` (from User account - already available)
   - ❌ `bio` (needs to be added to Agent or User model)
   - ❌ `jobTitle` (could use `role.title` or add new field)

2. **Contact Information:**
   - ❌ `extension` (internal phone extension - new field)
   - ❌ `mobile` (separate from phone - new field or use existing `phone`)

3. **Location/Address:**
   - ❌ `address`, `city`, `state`, `country`, `postal` (new fields)
   - ❌ `timezone` (new field)

4. **Work Information:**
   - ✅ `department` (already available via relation)
   - ✅ `role` (already available via relation)
   - ✅ `skills` (already in schema, not used)
   - ✅ `maxLoad` (already in schema, not used)
   - ❌ `employeeId` (could use `slug` or add new field)
   - ❌ `hireDate` (new field)
   - ❌ `managerId` (new relation)

5. **Preferences:**
   - ❌ `notifyEmail`, `notifyPush` (new fields)
   - ❌ `language` (new field)
   - ❌ `dateFormat` (new field)

6. **Status:**
   - ✅ `presenceStatus` (already available)
   - ✅ `lastSeenAt` (already available)
   - ✅ `isActive` (already available)

---

## 🎯 Summary

### Admin Profile:
- **Status:** ✅ Complete - All fields available and implemented
- **Missing:** Minimal (only optional fields like extension, manager reference)

### Agent Profile:
- **Status:** ⚠️ Incomplete - Many fields missing
- **Available but unused:** `skills`, `maxLoad`, `phone` (via User)
- **Needs schema changes:** `bio`, `address`, `timezone`, `notifyEmail`, `notifyPush`, `extension`, `mobile`, etc.

---

## 📄 Files Referenced

1. **Schema:** `prisma/schema.prisma`
   - Admin Model: Lines 231-250
   - Agent Model: Lines 59-88
   - User Model: Lines 90-109

2. **Admin Profile:**
   - Frontend: `pages/admin/profile/index.js`
   - API: `pages/api/admin/profile/index.js`

3. **Agent Profile:**
   - API: `pages/api/agent/profile.js`
   - Frontend: ❌ No dedicated profile page found (only used in admin view)

---

**Generated:** Profile Data Inspection Report
**Purpose:** Redesign Admin and Agent profile pages with Zoho-like layout

