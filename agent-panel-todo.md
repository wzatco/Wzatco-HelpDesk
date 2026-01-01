# Agent Panel Development To-Do List

## Overview
This document tracks the development progress of the Agent Panel, a streamlined interface for support agents to manage tickets, communicate with customers, and access resources. The Agent Panel mirrors the Admin Panel's UI/UX but with agent-scoped features and permissions.

## Architecture
- **Port:** Single port 3000 (same as admin panel)
- **Database:** Prisma/SQLite (same as admin panel)
- **APIs:** All APIs on port 3000 (`/api/agent/*`)
- **State Management:** React Context (AgentAuthContext, AgentChatContext, AgentNotificationsContext, AgentPresenceContext)
- **Real-time:** Socket.IO (same server as admin panel, path: `/api/widget/socket`)
- **Authentication:** JWT tokens stored in localStorage and httpOnly cookies

---

## Phase 1 — Foundation (COMPLETED ✅)

### 1.1 Agent Authentication System ✅
- [x] Agent login page (`/agent/login`)
- [x] JWT-based authentication
- [x] Password setup flow (forced on first login)
- [x] Token management (localStorage + httpOnly cookies)
- [x] Auto-redirect on invalid token
- [x] CAPTCHA integration (if enabled in settings)
- [x] Session management
- [x] Logout functionality

### 1.2 Agent Panel Layout ✅
- [x] AgentLayout component
- [x] AgentHeader component (logo, search, notifications, profile, connection status)
- [x] AgentSidebar component (navigation menu)
- [x] Agent dashboard page (`/agent/index.js`)
- [x] Responsive design (mobile-friendly)
- [x] Theme support (dark/light mode)

### 1.3 Socket.IO Integration ✅
- [x] Agent socket client (`lib/agentSocket.js`)
- [x] Socket connection management
- [x] Auto-reconnect logic
- [x] Connection status indicator
- [x] Event listeners (message, typing, presence, etc.)
- [x] JWT authentication for socket

### 1.4 State Management ✅
- [x] AgentAuthContext (authentication state)
- [x] AgentChatContext (chat/conversation state)
- [x] AgentNotificationsContext (notifications)
- [x] AgentPresenceContext (agent status: online, away, busy, offline)
- [x] Integration with `pages/_app.js`

---

## Phase 1.5 — New Feature Requests

### Ticket View Enhancements
- [ ] Hide Resolved and Closed tickets from default views (add filter toggle)
- [x] Escalate button with priority change and reason modal (✅ Complete - EscalateTicketModal.js)
- [x] Ticket Reopen functionality with Category and Reason (✅ Complete - ReopenTicketModal.js)

### Agent Status
- [ ] Active/Inactive status management (admin-controlled)

---

## Phase 2 — Ticket Management (PRIORITY 1)

### 2.1 Ticket List Page ✅
- [x] Ticket list page (`/agent/tickets`)
- [x] Display tickets assigned to agent
- [x] Display unassigned tickets (pool - agents can claim)
- [x] Filter by status (open, pending, resolved, closed)
- [x] Filter by priority (low, medium, high, urgent)
- [x] Filter by department (agent's departments only)
- [x] **Filter by "Need Reply"** (tickets where customer has replied but no agent/admin has replied, or new tickets with no agent/admin reply)
- [x] Search tickets by ID, customer name/email, subject
- [x] Sort options (newest, oldest, priority, due date)
- [x] Pagination (20 tickets per page)
- [x] Real-time ticket updates via Socket.IO
- [x] **COMPLETE:** Toast notifications for new ticket assignments (bottom right, stacked vertically)
- [x] **COMPLETE:** Socket.IO event listener for `ticket:assigned` events
- [x] Ticket count badges in sidebar
- [x] Quick actions (claim, assign to self, assign to other agent with reason popup, change status)
- [ ] Bulk actions (limited to agent's scope)
- [ ] Saved filters (agent-specific)

**API Endpoints Needed:**
- [x] `GET /api/agent/tickets` - List tickets (assigned + unassigned pool) ✅
  - [x] Query parameter: `needReply=true` - Filter tickets that need reply ✅
  - [x] Logic: Tickets where last message is from customer (no agent/admin reply after customer's last message) ✅
- [x] `GET /api/agent/tickets/counts` - Ticket counts ✅
  - [x] Include `needReply` count in response ✅
- [x] `POST /api/agent/tickets/[id]/claim` - Claim unassigned ticket ✅
- [x] `PATCH /api/agent/tickets/[id]` - Update ticket (limited fields) ✅

**Note:** "Need Reply" filter logic:
- Show tickets where the last message sender is 'customer'
- OR tickets with no messages (new tickets with only initial customer message)
- Exclude tickets where last message is from 'agent' or 'admin'

### 2.2 Ticket Detail View ✅
- [x] Ticket detail page (`/agent/tickets/[id]`)
- [x] Display ticket info (ID, subject, description, status, priority)
- [x] Display customer info (name, email, phone, address)
- [x] Display ticket creation details (editable by agent)
- [x] Display ticket timeline/history (activities)
- [x] Display product/accessory info
- [x] Display SLA information (if applicable)
- [x] Add internal notes (private/public)
- [x] Change ticket status (open, pending, resolved, closed)
- [x] Change ticket priority (with reason if required)
- [ ] **Transfer ticket to another agent or admin** (Details tab: "Transfer to" field with dropdown + reason popup - REQUIRED)
- [ ] **Transfer ticket from right sidebar** (Sidebar: "Transfer to" button with dropdown + reason popup - REQUIRED)
- [x] Add/remove tags
- [x] Add attachments
- [x] View ticket activities log
- [x] Customer previous tickets history
- [x] Related tickets

**Transfer Feature Requirements:**
- **Details Tab:** 
  - Rename "Assignee" field to "Transfer to"
  - Show dropdown with all agents AND admins (same as admin panel)
  - On selection, open popup modal to enter reason for transfer (REQUIRED)
  - Log transfer action in ticket activity history with reason
  
- **Right Sidebar:**
  - Rename "Assign to Agent" button to "Transfer to"
  - Show dropdown with all agents AND admins
  - On selection, open popup modal to enter reason for transfer (REQUIRED)
  - Log transfer action in ticket activity history with reason

**API Endpoints Needed:**
- [x] `GET /api/agent/tickets/[id]` - Get ticket details ✅
- [x] `GET /api/agent/tickets/[id]/activities` - Get ticket activities ✅
- [x] `PATCH /api/agent/tickets/[id]` - Update ticket ✅
- [x] `GET /api/agent/tickets/[id]/notes` - Get ticket notes ✅
- [x] `POST /api/agent/tickets/[id]/notes` - Create ticket note ✅
- [x] `GET /api/agent/customers/[id]/tickets` - Get customer's other tickets ✅

### 2.3 Ticket Chat Interface ✅
- [x] Conversation tab in ticket detail page
- [x] Display all messages/replies in conversation thread
- [x] Real-time message updates via Socket.IO
- [x] Send message/reply to ticket
- [x] Reply to specific message (threading)
- [x] Typing indicators
- [x] Message timestamps and date dividers
- [x] Message attachments (images, files)
- [x] File upload (images, videos, documents)
- [x] Emoji picker for messages
- [x] Message formatting (bold, italic, links)
- [x] Copy message content
- [x] Delete own messages (if permitted)
- [x] Mark messages as read
- [x] Scroll to bottom on new messages
- [x] Auto-scroll to message when replying
- [x] Message search within conversation
- [x] Export conversation transcript
- [x] Macros integration (insert macro content)
- [x] @mentions support (mention other agents)
- [ ] Knowledge base quick access (search and insert articles)

**API Endpoints Needed:**
- [x] `GET /api/agent/tickets/[id]/messages` - Get messages ✅
- [x] `POST /api/agent/tickets/[id]/messages` - Send message ✅
- [x] `POST /api/agent/upload` - Upload file for message attachment ✅

### 2.4 Ticket Actions (Agent-Scoped) ✅
- [ ] Claim unassigned ticket
- [ ] Assign ticket to self
- [ ] **Transfer ticket to another agent or admin (with reason popup - REQUIRED)**
  - Available in Details tab: "Transfer to" dropdown field
  - Available in Right sidebar: "Transfer to" button with dropdown
  - Must show all agents AND admins in dropdown
  - On selection, popup modal appears to enter transfer reason (mandatory)
  - Transfer reason logged in ticket activity history
  - Transfer updates ticket assignee and sends notification to new assignee
- [x] Change ticket status
- [x] Change ticket priority
- [x] Add internal notes
- [x] Add tags
- [x] Add attachments
- [x] Close ticket with resolution note
- [x] Reopen closed ticket
- [x] View ticket history
- [x] Export ticket details

**API Endpoints Needed:**
- [x] `POST /api/agent/tickets/[id]/claim` - Claim ticket ✅
- [ ] `GET /api/agent/users/list` - Get list of all agents and admins for transfer dropdown
- [x] `POST /api/agent/tickets/[id]/assign` - Assign ticket to another agent (requires reason) ✅
- [x] `POST /api/agent/tickets/[id]/transfer` - Transfer ticket (alias for assign, requires reason) ✅
- [x] `POST /api/agent/tickets/[id]/close` - Close ticket ✅
- [x] `POST /api/agent/tickets/[id]/reopen` - Reopen ticket ✅

**Note:** When transferring tickets to another agent or admin, a reason MUST be provided via a popup modal. The reason will be logged in the ticket activity history.

---

## Phase 3 — Knowledge Base Integration (PRIORITY 2)

### 3.1 Knowledge Base Browser
- [ ] Knowledge base page (`/agent/knowledge-base`)
- [ ] Display all published articles
- [ ] Search articles by title, content, tags
- [ ] Filter by category
- [ ] Filter by tags
- [ ] Article preview cards
- [ ] Article detail view
- [ ] Article content rendering (HTML, rich text, blocks)
- [ ] Related articles
- [ ] Article feedback (helpful/not helpful)
- [ ] Article views tracking
- [ ] Print article
- [ ] Share article link

**API Endpoints Needed:**
- [ ] `GET /api/agent/knowledge-base/articles` - List published articles
- [ ] `GET /api/agent/knowledge-base/articles/[slug]` - Get article details
- [ ] `GET /api/agent/knowledge-base/categories` - List categories
- [ ] `POST /api/agent/knowledge-base/articles/[id]/feedback` - Submit feedback

### 3.2 KB Quick Access (In Ticket Chat)
- [ ] KB search modal in ticket chat interface (state exists, UI pending)
- [ ] Quick article insertion into messages
- [ ] Article preview before insertion
- [ ] Search by keywords
- [ ] Filter by category
- [ ] Recent articles
- [ ] Popular articles

---

## Phase 4 — Macros (Canned Responses) (PRIORITY 2) ✅

### 4.1 Macros Access ✅
- [x] Macros popup/modal in ticket chat
- [x] Display all active macros
- [x] Search macros by name, shortcut, category
- [x] Filter by category
- [x] Insert macro content into message
- [x] Macro shortcuts (e.g., `/greeting`) - autocomplete implemented
- [x] Macro preview
- [ ] Recent macros
- [ ] Favorite macros (agent-specific)

**API Endpoints Needed:**
- [x] `GET /api/agent/macros` - List active macros (read-only) ✅ (uses admin API)
- [x] `GET /api/agent/macros/[id]` - Get macro details ✅

**Note:** Agents can only USE macros, not create/edit/delete them (admin-only).

---

## Phase 5 — Agent Dashboard (PRIORITY 2)

### 5.1 Dashboard Metrics
- [ ] Agent-specific statistics
- [ ] Tickets assigned today
- [ ] Tickets resolved today
- [ ] Average response time
- [ ] Average resolution time
- [ ] Open tickets count
- [ ] Pending tickets count
- [ ] SLA compliance rate (if applicable)
- [ ] Customer satisfaction score (if applicable)
- [ ] Performance trends (charts)
- [ ] Recent activity feed

**API Endpoints Needed:**
- `GET /api/agent/dashboard` - Get dashboard stats (already exists ✅)
- `GET /api/agent/dashboard/performance` - Get performance metrics
- `GET /api/agent/dashboard/activity` - Get recent activity

### 5.2 Dashboard Widgets
- [ ] Quick stats cards
- [ ] Performance charts (response time, resolution time)
- [ ] Ticket status distribution
- [ ] Priority distribution
- [ ] Recent tickets list
- [ ] Upcoming SLA deadlines
- [ ] Unread messages count
- [ ] Pending actions

---

## Phase 6 — Agent Profile & Settings (PRIORITY 3)

### 6.1 Agent Profile
- [ ] Profile page (`/agent/profile`)
- [ ] Display agent info (name, email, avatar)
- [ ] Edit profile (name, avatar, bio)
- [ ] Change password
- [ ] View department assignment
- [ ] View role/permissions
- [ ] View account status
- [ ] View last login
- [ ] View account creation date

**API Endpoints Needed:**
- `GET /api/agent/profile` - Get profile (already exists ✅)
- `PATCH /api/agent/profile` - Update profile
- `POST /api/agent/profile/change-password` - Change password
- `POST /api/agent/profile/avatar` - Upload avatar

### 6.2 Agent Status & Availability
- [ ] Status selector (online, away, busy, offline)
- [ ] Auto-away detection (inactivity)
- [ ] Manual status override
- [ ] Status message/custom message
- [ ] Working hours (if applicable)
- [ ] Status history

**API Endpoints Needed:**
- `PATCH /api/agent/presence` - Update presence status (already exists ✅)
- `GET /api/agent/presence/history` - Get status history

### 6.3 Agent Preferences
- [ ] Notification preferences
- [ ] Email notification settings
- [ ] Sound preferences
- [ ] Desktop notification settings
- [ ] Language preference
- [ ] Timezone setting
- [ ] Theme preference (dark/light)
- [ ] Ticket view preferences (default filters, sort order)
- [ ] Keyboard shortcuts

**API Endpoints Needed:**
- `GET /api/agent/preferences` - Get preferences
- `PATCH /api/agent/preferences` - Update preferences

---

## Phase 7 — Notifications & Alerts (PRIORITY 2) - ✅ COMPLETE

### 7.1 Real-time Notifications - ✅ COMPLETE
- [x] **✅ COMPLETE:** New ticket assigned (toast notification at bottom right + stored in notification bell)
- [x] **✅ COMPLETE:** Toast notification AND persistent notification in notification bell (both implemented)
- [x] **✅ COMPLETE:** Multiple ticket assignments stack vertically (one below other)
- [x] **✅ COMPLETE:** Toast auto-dismiss after 10 seconds (configurable)
- [x] **✅ COMPLETE:** Click toast to navigate to ticket
- [x] **✅ COMPLETE:** Notification stored in database and shown in notification bell dropdown
- [x] **✅ COMPLETE:** Real-time Socket.IO event listener for ticket assignments
- [x] **✅ COMPLETE:** New message notifications (toast + persistent, with smart filtering to avoid duplicates when viewing ticket)
- [x] **✅ COMPLETE:** Always-connected socket (stays connected across all pages)
- [x] **✅ COMPLETE:** Global event listeners in AgentAuthContext
- [x] **✅ COMPLETE:** Notification sound on new assignment/message
- [x] Ticket status changed
- [x] Ticket priority changed
- [ ] Customer replied (covered by new message notification)
- [ ] @mention in note/message
- [ ] SLA breach warning
- [ ] SLA escalation
- [ ] Ticket reopened
- [x] Notification badge in header (implemented)
- [x] **✅ COMPLETE:** Notification sound (configurable, 30% volume)
- [ ] Desktop notifications (browser API, future enhancement)

### 7.2 Notification Center - ✅ COMPLETE
- [x] **✅ COMPLETE:** Notification dropdown in header (notification bell)
- [x] **✅ COMPLETE:** Ticket assignment notifications stored in notification system
- [x] **✅ COMPLETE:** New message notifications stored in notification system
- [x] **✅ COMPLETE:** Notification badge count in header (shows unread count)
- [x] **✅ COMPLETE:** Click notification in dropdown to navigate to ticket
- [x] **✅ COMPLETE:** Mark individual notification as read
- [x] **✅ COMPLETE:** Mark all notifications as read
- [x] **✅ COMPLETE:** Real-time notification bell updates via socket events
- [ ] Notification list page (full history view - future enhancement)
- [ ] Filter by type (future enhancement)
- [ ] Delete notifications (API exists, UI pending)
- [ ] Notification settings (preferences - future enhancement)

### 7.3 Toast Notification System - ✅ COMPLETE
- [x] **✅ COMPLETE:** Toast component (bottom right position, fixed)
- [x] **✅ COMPLETE:** Stack multiple toasts vertically (newest at bottom)
- [x] **✅ COMPLETE:** Auto-dismiss after configurable time (default: 10 seconds)
- [x] **✅ COMPLETE:** Manual dismiss (close button on each toast)
- [x] **✅ COMPLETE:** Click toast to navigate to related ticket/page
- [x] **✅ COMPLETE:** Toast for ticket assignment (shows ticket ID, customer name, priority, subject preview)
- [x] **✅ COMPLETE:** Toast for new messages (shows ticket ID, customer name, message preview)
- [x] **✅ COMPLETE:** When toast appears, also create persistent notification in notification bell
- [x] **✅ COMPLETE:** Toast and notification bell synchronized (same data source)
- [x] **✅ COMPLETE:** Toast types: assignment (priority colors), message (blue theme)
- [x] **✅ COMPLETE:** Toast animations (slide in from right, fade out)
- [x] **✅ COMPLETE:** Maximum stack limit handled naturally (auto-dismiss prevents overflow)
- [x] **✅ COMPLETE:** Toast spacing (gap between stacked toasts)
- [x] **✅ COMPLETE:** Z-index management (toasts above all content, z-[9999])
- [x] **✅ COMPLETE:** Responsive design (mobile-friendly toast positioning)
- [x] **✅ COMPLETE:** Smart filtering for message toasts (only show if not viewing that ticket)

**API Endpoints:**
- [x] `GET /api/agent/notifications` - Get notifications ✅
- [x] `POST /api/agent/notifications` - Create notification (for ticket assignments & messages) ✅
- [x] `PATCH /api/agent/notifications/[id]/read` - Mark as read ✅
- [ ] `POST /api/agent/notifications/mark-all-read` - Mark all as read (uses individual PATCH in loop)
- [x] `DELETE /api/agent/notifications/[id]` - Delete notification ✅
- [ ] `GET /api/agent/notifications/unread-count` - Get unread notification count (computed from notifications array)

**Implementation Note:** 
The global notification system is fully implemented with:
- Always-connected socket in `AgentAuthContext` (centralized connection management)
- Global listeners for `ticket:assigned` and `receive_message` events
- Dual notification system: Toast (immediate) + Persistent (notification bell)
- Smart filtering to prevent duplicate notifications
- Real-time updates across all pages (Dashboard, Settings, etc.)
- Complete documentation in `AGENT_GLOBAL_NOTIFICATIONS_SYSTEM.md`

**Documentation:** See `AGENT_GLOBAL_NOTIFICATIONS_SYSTEM.md` for complete architecture, flow diagrams, testing guide, and troubleshooting.

---

## Phase 8 — Search & Filters (PRIORITY 3)

### 8.1 Global Search
- [ ] Global search bar in header
- [ ] Search tickets
- [ ] Search customers
- [ ] Search knowledge base articles
- [ ] Search macros
- [ ] Search results page
- [ ] Quick actions from search results
- [ ] Search history
- [ ] Recent searches

**API Endpoints Needed:**
- `GET /api/agent/search` - Global search
- `GET /api/agent/search/history` - Search history

### 8.2 Custom Filters
- [ ] Save custom ticket filters
- [ ] Apply saved filters
- [ ] Edit saved filters
- [ ] Delete saved filters
- [ ] Share filters (if permitted)
- [ ] Default filter on page load

**API Endpoints Needed:**
- `GET /api/agent/filters` - Get saved filters
- `POST /api/agent/filters` - Save filter
- `PATCH /api/agent/filters/[id]` - Update filter
- `DELETE /api/agent/filters/[id]` - Delete filter

---

## Phase 9 — Reports & Analytics (PRIORITY 3)

### 9.1 Agent Performance Reports
- [ ] Agent performance page (`/agent/reports`)
- [ ] Tickets handled (count, by status)
- [ ] Response time metrics
- [ ] Resolution time metrics
- [ ] First response time
- [ ] Average handling time
- [ ] Customer satisfaction (if applicable)
- [ ] SLA compliance rate
- [ ] Performance trends (charts)
- [ ] Date range filtering
- [ ] Export to CSV

**API Endpoints Needed:**
- `GET /api/agent/reports/performance` - Get performance report
- `GET /api/agent/reports/export` - Export report to CSV

### 9.2 Ticket Reports
- [ ] Tickets by status
- [ ] Tickets by priority
- [ ] Tickets by department
- [ ] Tickets by product/accessory
- [ ] Resolution rate
- [ ] Average resolution time
- [ ] Date range filtering

**API Endpoints Needed:**
- `GET /api/agent/reports/tickets` - Get ticket reports

---

## Phase 10 — Advanced Features (PRIORITY 4)

### 10.1 Keyboard Shortcuts
- [ ] Shortcut help modal
- [ ] Navigate tickets (next/previous)
- [ ] Quick actions (reply, close, etc.)
- [ ] Search shortcuts
- [ ] Macro shortcuts
- [ ] Customizable shortcuts

### 10.2 Bulk Operations
- [ ] Select multiple tickets
- [ ] Bulk status change
- [ ] Bulk priority change
- [ ] Bulk assign (to self)
- [ ] Bulk tag add/remove
- [ ] Bulk export

**API Endpoints Needed:**
- `POST /api/agent/tickets/bulk-update` - Bulk update tickets

### 10.3 Productivity Tools
- [ ] Quick reply templates (agent-specific)
- [ ] Snippets (agent-specific)
- [ ] Ticket templates (use only)
- [ ] Time tracking (if applicable)
- [ ] Worklogs (if applicable)

---

## Phase 11 — Mobile Responsiveness (PRIORITY 3)

### 11.1 Mobile UI
- [ ] Responsive ticket list
- [ ] Mobile-friendly ticket detail view
- [ ] Mobile chat interface
- [ ] Touch-friendly buttons
- [ ] Swipe gestures
- [ ] Mobile navigation
- [ ] Mobile search

### 11.2 Progressive Web App (PWA)
- [ ] Service worker
- [ ] Offline support
- [ ] Install prompt
- [ ] Push notifications
- [ ] App manifest

---

## Phase 12 — Testing & Quality Assurance (PRIORITY 4)

### 12.1 Testing
- [ ] Unit tests for components
- [ ] Integration tests for APIs
- [ ] E2E tests for critical flows
- [ ] Performance testing
- [ ] Security testing
- [ ] Cross-browser testing
- [ ] Mobile device testing

### 12.2 Documentation
- [ ] Agent user guide
- [ ] API documentation
- [ ] Component documentation
- [ ] Deployment guide

---

## Phase 13 — Deployment & Monitoring (PRIORITY 4)

### 13.1 Deployment
- [ ] Production build
- [ ] Environment configuration
- [ ] Database migrations
- [ ] SSL certificates
- [ ] CDN setup (if applicable)

### 13.2 Monitoring
- [ ] Error tracking
- [ ] Performance monitoring
- [ ] Usage analytics
- [ ] Agent activity logs

---

## Implementation Notes

### Agent Scope & Permissions
- Agents can only view/edit tickets assigned to them (or unassigned tickets they can claim)
- Agents cannot manage other agents, departments, products, or system settings
- Agents can use macros but cannot create/edit/delete them
- Agents can view knowledge base articles but cannot create/edit/delete them
- Agents can view their own performance reports only
- All agent actions should be logged for audit purposes

### Critical Requirements (MUST HAVE)
- **Ticket Assignment Notifications:** Agents MUST receive real-time toast notifications AND persistent notifications when assigned to tickets. This is a critical feature for agent responsiveness and ticket management efficiency.
  - **Toast Notifications (Immediate):**
    - Toast notifications must appear at bottom right
    - Multiple assignments must stack vertically (one below the other)
    - Clicking toast must navigate to the ticket
    - Toast must show ticket ID, customer name, priority, and subject preview
    - Auto-dismiss after configurable time (default: 5 seconds)
    - Manual dismiss option (close button)
  - **Persistent Notifications (Notification Bell):**
    - Notification must be stored in database
    - Notification must appear in notification bell dropdown in header
    - Notification badge must show unread count
    - Clicking notification in dropdown must navigate to ticket
    - Notifications must persist until marked as read or deleted
    - Real-time updates in notification dropdown via Socket.IO
  - **Integration:**
    - Socket.IO integration required for real-time updates
    - When ticket assigned: show toast AND create notification record
    - Toast and notification bell must be synchronized (same data source)

### API Pattern
- All agent APIs should use `requireAgentAuth` middleware
- All agent APIs should check if the agent has access to the requested resource
- Use `getCurrentAgentId` to get the authenticated agent ID
- Filter queries by `assigneeId` or allow access to unassigned tickets

### "Need Reply" Filter Implementation
- **Purpose:** Help agents quickly identify tickets that require their response
- **Logic:**
  - Tickets where last message `senderType === 'customer'`
  - OR tickets with no agent/admin messages (only initial customer message)
  - Exclude tickets where last message is from 'agent' or 'admin'
- **Backend Query:**
  - Join with `Message` table
  - Order messages by `createdAt DESC`
  - Filter where last message's `senderType` is 'customer'
  - OR where no messages exist with `senderType` in ['agent', 'admin']
- **Frontend:**
  - Add "Need Reply" filter option in filter dropdown
  - Show count badge next to filter option
  - Highlight tickets in list that need reply
- **Note:** This filter should also be implemented in Admin Panel tickets list page

### UI/UX Consistency
- Match admin panel's design system
- Use same components (Card, Button, Badge, etc.)
- Use same color scheme and theming
- Maintain consistent navigation patterns
- Use same icons and visual language

---

## Phase 8 — New Feature Requests

### Ticket View Enhancements
- [ ] Hide Resolved and Closed tickets from default views (add filter toggle to show/hide)
- [ ] Escalate button with priority change and reason modal (must update DB)
- [ ] Ticket Reopen functionality with Category and Reason fields

### Agent Status Management
- [ ] Active/Inactive status (admin-controlled via Admin Panel)
- [ ] Auto-assignment only to online/active agents

---

## Current Status

**Last Updated:** December 18, 2025
**Current Phase:** Phase 2 - Ticket Management (MOSTLY COMPLETE ✅)
**Next Critical Tasks:** 
1. Toast notification system for ticket assignments (Phase 7.3)
2. Knowledge base quick access UI (Phase 3.2)
3. Bulk operations (Phase 2.1)
4. Saved filters (Phase 2.1)
