# Admin Panel To-Do Tracker

Note: Tick items as completed. Dates/owners are placeholders – adjust as needed.

## Phase 1 — Enhanced Ticket Management (Current)
- [x] Admin notes panel always visible (UI on ticket detail)
- [x] Admin notes: timestamp, author, pinning, edit/delete
- [x] Public/private ticket notes (visibility control)
- [x] Tags: add/remove on ticket (Pickup, Service, Delivery, CX Hold, Supplier Hold, Recurance, Sprair Mising)
- [x] Tag management page (CRUD, colors)
- [x] Priority change inline with audit trail + reason
- [x] Easy navigation: next/previous ticket, keyboard shortcuts (J/K)
- [x] Bulk select in tickets list
- [x] Bulk transfer to agent/team
- [x] Bulk status/priority/tag updates
- [x] Assignment rules engine (round-robin, load, department/skill)
- [x] Assignment rules admin UI (enable/disable, order, preview)

## Phase 2 — Advanced Search & Filtering of tickets
- [x] Search by Mobile No
- [x] Search by Customer Email
- [x] Search by Customer Name
- [x] Search by Ticket ID
- [x] Search by Products
- [x] Filter by Product/Model
- [x] Filter by tags
- [x] Filter by Agents
- [x] Saved filters (create/update/delete)
- [x] Export current result set (Excel/CSV)
- [ ] Concurrency alert: multiple agents viewing same ticket
- [ ] View Ticket option for other agents even if the ticket is opened by an agent
- [ ] If an agent view the ticket which is opened by another agent, add an option to leave the note with options private/public (Public means other agents can see that note [Not the customers])

## Phase 4 — Analytics & Reporting
- [x] Product-wise analytics (issues, resolution time)
- [x] Issue-wise analytics
- [x] Ticket-wise TAT exceeded report
- [x] Customer feedback/CSAT report
- [x] Agent performance (resolution, FRT, CSAT)
- [x] Department analytics dashboards
- [x] Conditional Filters (saved filters with multiple conditions)

## Phase 5 — Departments & Teams
- [x] Departments list & details (Technical, Operations, Service, Logistics)
- [x] Team assignment workflow
- [x] Department SLAs and working hours/holidays
- [x] Route tickets to departments

## Phase 6 — Time Tracking & SLAs
- [x] Agent worklog (auto start/stop + manual)
- [x] Agent TAT per ticket computation
- [x] SLA Policies Management (CRUD)
- [x] SLA Workflows Builder (visual drag-and-drop)
- [x] SLA Timers (response/resolution tracking)
- [x] SLA Breaches (tracking and notifications)
- [x] SLA Escalations (80%, 95%, breach alerts)
- [x] SLA Reports & Analytics (compliance, averages, breach analysis)
- [~] SLA policies per department (backend ready, UI form missing)
- [~] SLA risk indicator and alerts (alerts exist, visual indicator on tickets may be missing)
- [~] TAT reports (filters exist, export functionality missing)

## Phase 7 — Notifications & Collaboration
- [x] In-app notifications (assignments, mentions, SLA risk)
- [x] Email notifications for key events (Amazon SES SMTP)
- [x] @Mentions in internal comments
- [x] Presence avatars on ticket view

## Phase 8 — Products & Models
- [x] Product/Model master data (CRUD)
- [x] Attach docs to products
- [x] Product/Accessory dimension in analytics
- [x] Product/Accessory selection in ticket forms

# Phase 9 — Admin Settings — To-Do List

## Basic Settings
- [x] App Title
- [x] App Email

## Captcha
- [x] Captcha Length
- [x] Captcha Type (Alphanumeric / Numeric)

## AI Settings
- [x] API Keys Field
- [x] Enable/Disable AI Features

## File Upload
- [x] Max Upload Size
- [x] Allowed File Types
- [x] Client Phone Upload (Enable/Disable)
- [x] Ticket File Upload (Enable/Disable)

## Ticket Settings
- [x] Any Staff Can Reply (Enable/Disable)
- [x] Hide Priority Input for Customer
- [x] Hide Priority in Admin Panel
- [x] Auto-Close Tickets (Enable/Disable)
- [x] Auto-Close Rule (Close inactive tickets after X hours)
- [x] Editable Closing Message
- [x] User Max Open Tickets Limit
- [x] User Can Re-Open Tickets (Enable/Disable)
- [x] Re-Open Time (X Days)
- [x] Positive Feedback Message
- [x] Negative Feedback Message

## Notification System
- [x] Enable/Disable Notification System
- [x] Configure Notification Triggers

## Security Settings
- [x] Admin Login Security (Enable/Disable)
- [x] Temporary Account Lock (X failed attempts in X minutes)
- [x] DoS Attack Protection
- [x] Spam Email Blocklist

## Advanced Features
- [x] Ticket Templates for Common Issues
- [x] Escalation Rules (Time/Priority Based)
- [x] External Integration APIs


## Phase 10 — Advanced Features
- [x] Ticket templates for common issues
- [x] Escalation rules (time/priority based)
- [x] External integration APIs

---

## Backlog (Nice-to-have)
- [x] Mobile app shell (read-only dashboards)
- [x] Dark mode
- [ ] Per-tenant theming
- [x] Remove Admin Profile and Logout button from the sidebar

## Important Tasks
- [ ] On the landing page we have to display KB with proper categories, and proper details.

---

## Phase 11 — New Feature Requests

### Ticket Management Enhancements
- [ ] Hide Resolved and Closed tickets from default ticket views (add toggle to show/hide)
- [ ] Remove "Urgent" priority option for customers (keep only Low, Medium, High)
- [ ] Add Escalate button for agents/admins with priority and reason options (Priority must update in DB)
- [ ] Allow customers to Close their own tickets
- [ ] Ticket Reopen with Category and Reason fields

### Knowledge Base & Articles
- [ ] Admin approval workflow for articles created by agents
- [ ] Article review/approval queue for admins

### Reporting & Analytics
- [ ] AI Analysis for reports (insights, trends, recommendations)
- [ ] Fix SLA Reports (bugs and accuracy issues)

### Agent Management
- [ ] Agent Active/Inactive toggle option for admins
- [ ] Ticket auto-assignment to online agents only (skip offline/inactive agents)

### Authentication & Security
- [x] Google Auth Login in Widget for customers (✅ Complete - see GOOGLE_AUTH_IMPLEMENTATION_COMPLETE.md)