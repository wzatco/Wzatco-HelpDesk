# Agent Panel To-Do Tracker

**Project Overview:**  
Building a comprehensive Agent Panel that integrates with the WZATCO Widget backend for real-time customer support, ticket management, and live chat functionality.

**Architecture:**
- **Port Strategy:** Single port (3000) shared with Admin Panel
- **Backend Connection:** WZATCO Widget Backend (Port 5000) via Socket.IO
- **Database:** MongoDB (Widget Backend) + SQLite (Admin Panel for agent records)
- **Tech Stack:** Next.js, Prisma, Tailwind CSS, Socket.IO Client, Zustand (state management)

---

## Port & Architecture Strategy

### ✅ **RECOMMENDED: Single Port Approach (Port 3000)**

**Why Single Port?**
- ✅ Code sharing between Admin & Agent panels (components, layouts, utilities)
- ✅ Simplified deployment and maintenance
- ✅ Shared authentication context
- ✅ No CORS issues between panels
- ✅ Easier to manage environment variables

**Port Allocation:**
```
┌─────────────────────────────────────────────────────────┐
│  Port 3000: Next.js App (Admin + Agent Panel)          │
│  ├── /admin/*     → Admin Panel Routes                 │
│  └── /agent/*     → Agent Panel Routes (NEW)           │
│                                                          │
│  Port 5000: WZATCO Widget Backend (Express + Socket.IO)│
│  ├── REST API                                           │
│  └── WebSocket (Live Chat, Tickets, Notifications)     │
│                                                          │
│  Port 8000: Customer Widget (Next.js) - Optional       │
└─────────────────────────────────────────────────────────┘
```

**Connection Flow:**
```
Agent Panel (Port 3000)
    │
    ├──► HTTP REST API ────────┐
    │                           ▼
    └──► WebSocket Client ──► Widget Backend (Port 5000)
                                │
                                ├──► MongoDB (Chats, Tickets, Customers)
                                └──► Socket.IO Events (Real-time)
```

---

## Phase 1 — Foundation & Authentication (PRIORITY 1)

### 1.1 Agent Authentication System
- [ ] Create `Agent` model in Prisma (or use Widget's MongoDB User model)
- [ ] Agent login page (`/agent/login`)
- [ ] Agent authentication context (`AgentAuthContext.js`)
- [ ] JWT token storage (localStorage + httpOnly cookies)
- [ ] Session management (24-hour sessions)
- [ ] Logout functionality
- [ ] Password reset flow
- [ ] "Remember Me" option

### 1.2 Agent Panel Layout
- [ ] Create `AgentLayout` component (sidebar + topbar + main content)
- [ ] Agent sidebar navigation (Dashboard, Chats, Tickets, KB, Profile)
- [ ] Agent topbar (search, notifications, profile dropdown, status indicator)
- [ ] Responsive design (mobile-friendly)
- [ ] Dark/Light theme toggle (inherit from admin settings)
- [ ] Loading states and error boundaries

### 1.3 Socket.IO Integration
- [ ] Create `lib/widgetSocket.js` (Socket.IO client for port 5000)
- [ ] Auto-connect on agent login with JWT auth
- [ ] Auto-reconnect with exponential backoff
- [ ] Connection status indicator (online/offline)
- [ ] Event listener setup (new_chat, new_message, typing, etc.)
- [ ] Event queue for offline messages
- [ ] Heartbeat/ping-pong for connection health

### 1.4 State Management
- [ ] Setup Zustand stores for agent panel
- [ ] `useAgentAuthStore` (agent info, token, status)
- [ ] `useChatsStore` (active chats, waiting queue, chat history)
- [ ] `useMessagesStore` (messages per conversation)
- [ ] `useTypingStore` (typing indicators)
- [ ] `useNotificationsStore` (agent notifications)
- [ ] `useAgentPresenceStore` (agent status: online/away/busy)

---

## Phase 2 — Live Chat System (PRIORITY 1)

### 2.1 Chat Queue & List
- [ ] Chat list page (`/agent/chats`)
- [ ] Display waiting chats (unassigned queue)
- [ ] Display active chats (assigned to agent)
- [ ] Display chat history (closed chats)
- [ ] Real-time updates via Socket.IO
- [ ] Chat preview (last message, customer name, wait time)
- [ ] Department-based filtering
- [ ] Search chats by customer name/email
- [ ] Sort by: newest, oldest, wait time
- [ ] Unread message count badge

### 2.2 Live Chat Window
- [ ] Chat window component (`/agent/chats/[id]`)
- [ ] Load chat history from backend
- [ ] Display messages (customer vs agent styling)
- [ ] Real-time message updates via Socket.IO
- [ ] Send message functionality
- [ ] Typing indicator (show when customer is typing)
- [ ] Send typing indicator to customer
- [ ] File attachment support (images, documents)
- [ ] Emoji picker
- [ ] Message timestamps
- [ ] Read receipts
- [ ] Auto-scroll to latest message
- [ ] Mark messages as read

### 2.3 Chat Actions
- [ ] Claim/Assign chat to self
- [ ] Transfer chat to another agent
- [ ] Transfer chat to another department
- [ ] Close chat
- [ ] Reopen chat
- [ ] Add internal notes (visible to agents only)
- [ ] Tag chat (resolved, escalated, spam, etc.)
- [ ] Block customer (spam prevention)
- [ ] Export chat transcript
- [ ] Convert chat to ticket

### 2.4 Customer Information Panel
- [ ] Display customer name, email, phone
- [ ] Customer location (if available)
- [ ] Customer previous chats history
- [ ] Customer previous tickets
- [ ] Customer tags/labels
- [ ] Customer custom fields
- [ ] Customer notes (internal)
- [ ] Customer lifetime value (if integrated)

---

## Phase 3 — Ticket Management (PRIORITY 2)

### 3.1 Ticket List
- [ ] Ticket list page (`/agent/tickets`)
- [ ] Display all tickets assigned to agent
- [ ] Display unassigned tickets (pool)
- [ ] Filter by status (open, pending, resolved, closed)
- [ ] Filter by priority (low, medium, high, urgent)
- [ ] Filter by department
- [ ] Search tickets by ID, customer, subject
- [ ] Sort options (newest, oldest, priority, due date)
- [ ] Pagination (20 tickets per page)
- [ ] Real-time ticket updates via Socket.IO

### 3.2 Ticket Detail View
- [ ] Ticket detail page (`/agent/tickets/[id]`)
- [ ] Display ticket info (ID, subject, description, status, priority)
- [ ] Display customer info
- [ ] Display ticket timeline/history
- [ ] Display all messages/replies
- [ ] Reply to ticket
- [ ] Add internal notes
- [ ] Change ticket status
- [ ] Change ticket priority
- [ ] Assign ticket to another agent
- [ ] Add tags to ticket
- [ ] Add attachments
- [ ] Set due date
- [ ] Link related tickets
- [ ] Convert ticket to chat (if needed)

### 3.3 Ticket Actions
- [ ] Create new ticket (on behalf of customer)
- [ ] Merge duplicate tickets
- [ ] Split ticket into multiple
- [ ] Clone ticket
- [ ] Escalate ticket
- [ ] Mark as spam
- [ ] Close ticket with resolution note
- [ ] Reopen closed ticket
- [ ] Export ticket details

---

## Phase 4 — Knowledge Base Integration (PRIORITY 2)

### 4.1 Knowledge Base Browser
- [ ] KB list page (`/agent/knowledge-base`)
- [ ] Display all KB articles
- [ ] Category-based navigation
- [ ] Search KB articles
- [ ] View article details
- [ ] Copy article link (to share with customer)
- [ ] Recent/popular articles
- [ ] Bookmark favorite articles

### 4.2 KB Quick Access
- [ ] KB search in chat window (quick insert)
- [ ] KB search in ticket reply (quick insert)
- [ ] Suggested articles based on customer query (AI)
- [ ] Share KB article in chat/ticket reply

---

## Phase 5 — Canned Responses (PRIORITY 2)

### 5.1 Canned Responses Management
- [ ] Canned responses page (`/agent/canned-responses`)
- [ ] List all canned responses
- [ ] Create new canned response
- [ ] Edit canned response
- [ ] Delete canned response
- [ ] Category/tag for responses
- [ ] Search canned responses
- [ ] Personal vs Team canned responses

### 5.2 Canned Responses Quick Access
- [ ] Insert canned response in chat (shortcut: `/`)
- [ ] Insert canned response in ticket reply
- [ ] Variable support ({{customer_name}}, {{agent_name}}, etc.)
- [ ] Preview before sending

---

## Phase 6 — Agent Dashboard (PRIORITY 2)

### 6.1 Dashboard Metrics
- [ ] Dashboard page (`/agent`)
- [ ] Active chats count
- [ ] Waiting chats count
- [ ] Open tickets count
- [ ] Resolved tickets today
- [ ] Average response time
- [ ] Average resolution time
- [ ] Customer satisfaction score (CSAT)
- [ ] Today's activity summary

### 6.2 Dashboard Widgets
- [ ] Recent chats widget
- [ ] Pending tickets widget
- [ ] Performance chart (daily/weekly)
- [ ] Quick actions (start chat, create ticket)
- [ ] Announcements/updates from admin

---

## Phase 7 — Agent Profile & Settings (PRIORITY 3)

### 7.1 Agent Profile
- [ ] Profile page (`/agent/profile`)
- [ ] Display agent name, email, avatar
- [ ] Edit profile information
- [ ] Change password
- [ ] Upload/change avatar
- [ ] Agent bio/signature
- [ ] Timezone settings
- [ ] Language preference

### 7.2 Agent Status & Availability
- [ ] Set agent status (online, away, busy, offline)
- [ ] Status auto-change on idle (5 min → away)
- [ ] Do Not Disturb (DND) mode
- [ ] On Leave status
- [ ] In Meeting status
- [ ] Working hours setup
- [ ] Break time tracking
- [ ] Capacity limit (max concurrent chats)

### 7.3 Agent Preferences
- [ ] Notification preferences (sound, desktop, email)
- [ ] Chat assignment preferences (auto-accept, manual accept)
- [ ] Keyboard shortcuts customization
- [ ] Default message signature
- [ ] Auto-responses for common scenarios

---

## Phase 8 — Notifications & Alerts (PRIORITY 2)

### 8.1 Real-time Notifications
- [ ] New chat assigned notification
- [ ] New message in active chat
- [ ] New ticket assigned notification
- [ ] Ticket reply notification
- [ ] Mention in internal note (@agent)
- [ ] SLA breach alert
- [ ] Customer waiting too long alert
- [ ] Agent offline alert (auto-away)

### 8.2 Notification Center
- [ ] Notification dropdown in topbar
- [ ] Notification list with icons
- [ ] Mark as read/unread
- [ ] Clear all notifications
- [ ] Notification history page
- [ ] Notification preferences

### 8.3 Sound & Desktop Notifications
- [ ] Play sound on new chat
- [ ] Play sound on new message
- [ ] Desktop notification (browser API)
- [ ] Custom notification sounds
- [ ] Mute notifications temporarily

---

## Phase 9 — Search & Filters (PRIORITY 3)

### 9.1 Global Search
- [ ] Global search bar in topbar
- [ ] Search across chats, tickets, customers, KB
- [ ] Recent searches
- [ ] Search suggestions/autocomplete
- [ ] Advanced search filters
- [ ] Save search queries

### 9.2 Custom Filters
- [ ] Create custom ticket filters
- [ ] Create custom chat filters
- [ ] Save filters for quick access
- [ ] Share filters with team
- [ ] Default filter on page load

---

## Phase 10 — Reports & Analytics (PRIORITY 3)

### 10.1 Agent Performance Reports
- [ ] Reports page (`/agent/reports`)
- [ ] Tickets handled (daily/weekly/monthly)
- [ ] Chats handled
- [ ] Average response time
- [ ] Average resolution time
- [ ] First response time (FRT)
- [ ] Customer satisfaction (CSAT)
- [ ] Rating breakdown
- [ ] Performance trends (charts)

### 10.2 Export & Download
- [ ] Export reports to CSV/Excel
- [ ] Download chat transcripts
- [ ] Download ticket details
- [ ] Schedule reports (email daily/weekly)

---

## Phase 11 — Collaboration Features (PRIORITY 3)

### 11.1 Internal Communication
- [ ] @Mention agents in notes
- [ ] Internal chat between agents (optional)
- [ ] Presence indicators (who's viewing ticket/chat)
- [ ] Collaborative ticket resolution
- [ ] Handoff notes when transferring

### 11.2 Team Features
- [ ] View team members
- [ ] View team workload
- [ ] Request help from supervisor
- [ ] Escalate to senior agent
- [ ] Team announcements

---

## Phase 12 — Advanced Features (PRIORITY 4)

### 12.1 AI & Automation
- [ ] AI suggested replies (based on customer query)
- [ ] Auto-tagging of chats/tickets
- [ ] Sentiment analysis (customer mood)
- [ ] Auto-translate messages (multi-language support)
- [ ] Smart routing (assign to best agent)

### 12.2 Integrations
- [ ] Email integration (reply via email)
- [ ] CRM integration (customer data sync)
- [ ] Calendar integration (schedule follow-ups)
- [ ] Third-party app integrations

### 12.3 Productivity Tools
- [ ] Keyboard shortcuts (J/K for navigation, Ctrl+Enter to send)
- [ ] Bulk actions (close multiple chats, resolve multiple tickets)
- [ ] Templates for common responses
- [ ] Macros for repeated actions
- [ ] Scheduled messages

---

## Phase 13 — Mobile Responsiveness (PRIORITY 3)

### 13.1 Mobile UI
- [ ] Responsive layout for all pages
- [ ] Mobile-optimized chat window
- [ ] Mobile-optimized ticket view
- [ ] Touch-friendly buttons and inputs
- [ ] Mobile navigation (hamburger menu)

### 13.2 Progressive Web App (PWA)
- [ ] Service worker setup
- [ ] Offline support (view cached data)
- [ ] Add to home screen support
- [ ] Push notifications (mobile)

---

## Phase 14 — Testing & Quality Assurance (PRIORITY 4)

### 14.1 Testing
- [ ] Unit tests for critical functions
- [ ] Integration tests for Socket.IO events
- [ ] E2E tests for chat flow
- [ ] E2E tests for ticket flow
- [ ] Performance testing (load test with multiple agents)
- [ ] Browser compatibility testing

### 14.2 Documentation
- [ ] Agent user guide
- [ ] API documentation (widget backend endpoints)
- [ ] Socket events documentation
- [ ] Troubleshooting guide
- [ ] Video tutorials

---

## Phase 15 — Deployment & Monitoring (PRIORITY 4)

### 15.1 Deployment
- [ ] Environment setup (production)
- [ ] Environment variables configuration
- [ ] SSL certificate setup
- [ ] Domain setup (agent.wzatco.com)
- [ ] Load balancing (if needed)

### 15.2 Monitoring
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Socket connection monitoring
- [ ] User analytics

---

## Milestones & Targets

- **Phase 1 (Foundation):** Week 1-2
- **Phase 2 (Live Chat):** Week 2-3
- **Phase 3 (Tickets):** Week 3-4
- **Phase 4 (KB):** Week 4-5
- **Phase 5 (Canned Responses):** Week 5
- **Phase 6 (Dashboard):** Week 5-6
- **Phase 7 (Profile):** Week 6
- **Phase 8 (Notifications):** Week 6-7
- **Phase 9 (Search):** Week 7
- **Phase 10 (Reports):** Week 7-8
- **Phases 11-15:** Week 8-12 (iterative)

---

## Technical Architecture Decisions

### Database Strategy
**Option A: Dual Database (RECOMMENDED)**
- Widget Backend (MongoDB): Chats, Messages, Customers, Tickets
- Admin Panel (SQLite): Agent records, preferences, local settings
- Sync agent data between systems

**Option B: MongoDB Only**
- Use Widget's MongoDB for everything
- Admin panel connects to MongoDB for agent records

### Authentication Strategy
**RECOMMENDED:**
- Agents authenticate via Widget Backend (MongoDB users)
- Store JWT token in Admin Panel's localStorage
- Use token for both REST API and Socket.IO auth
- Share session between admin and agent roles (if needed)

---

## Backlog (Nice-to-have)

- [ ] Video chat support (WebRTC)
- [ ] Screen sharing during chat
- [ ] Co-browsing with customer
- [ ] Voice messages
- [ ] Chat bot integration (AI auto-responses)
- [ ] Multi-language support (i18n)
- [ ] Agent gamification (badges, leaderboards)
- [ ] Customer feedback after chat
- [ ] Chat quality scoring
- [ ] Agent coaching tools (supervisor mode)

---

## Important Notes

1. **Always maintain backward compatibility** with Widget Backend
2. **Test Socket.IO events** thoroughly before moving to next phase
3. **Mobile-first design** for agent on-the-go
4. **Security**: Validate all inputs, sanitize messages, prevent XSS
5. **Performance**: Optimize for 50+ concurrent chats per agent
6. **Accessibility**: WCAG 2.1 Level AA compliance
7. **Error Handling**: Graceful degradation when backend is down

---

## Quick Start Checklist

- [ ] Setup Next.js routes under `/agent/*`
- [ ] Install Socket.IO client (`socket.io-client`)
- [ ] Install Zustand (`zustand`)
- [ ] Create agent authentication flow
- [ ] Connect to Widget Backend (port 5000)
- [ ] Test Socket.IO connection
- [ ] Build first chat window prototype
- [ ] Iterate and improve!

---

**Status:** Planning Complete ✅  
**Next Steps:** Phase 1 Implementation (Foundation & Authentication)

---

**End of Agent Panel To-Do Tracker**

