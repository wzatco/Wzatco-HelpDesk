# Help Desk System – Blueprint Document

## 1. Overview
We are building a **full Help Desk System (HubSpot-style)** with:
- **Admin Panel** → system-wide control & analytics.
- **Agent Panel** → ticket handling & collaboration.
- **Customer Widget** → floating embeddable widget.
- **APIs** → omnichannel support (email, chat, web form, widget, social in future).

System will be **self-hosted on a VPS**.  
The widget will be served as a **JS embed script**.

---

## 2. Customer Experience (Widget)

### Floating Widget
- Launcher button → small popup with chat + KB.
- Expand to overlay → sidebar navigation:
  - **Chat**
  - **Tickets** (customer’s ticket history)
  - **Knowledge Base**
- Collapse back to small widget.

### Flow
1. Customer types → KB suggests answers.
2. If KB fails → AI handles.
3. If AI fails or detects frustration → show ticket form.
4. Ticket submission → routed to Agent panel.

---

## 3. Admin Features
Admin has **HubSpot-style complete control**, not just widget settings.

- **Dashboard**
  - KPIs: open tickets, SLA breaches, CSAT, workload.
- **Ticketing Management**
  - Create/update tickets
  - View assignment, SLA timers
  - Merge, close, reopen
- **Team Management**
  - Agents, roles, groups
  - Skill-based routing
- **Workflows & Automation**
  - Drag-drop workflow builder
  - Auto-assign, escalate, send emails
- **Knowledge Base**
  - Categories, tags, AI embedding
  - SEO-friendly KB articles
- **Omnichannel Settings**
  - Email integration
  - Web forms
  - Chat widget configuration
- **Reports & Analytics**
  - SLA compliance
  - Agent productivity
  - Ticket volume trends
  - CSAT surveys
- **Widget Settings**
  - Branding, colors, launcher position
  - Domain whitelisting
  - API keys

---

## 4. Agent Features
- Unified inbox (all tickets, all channels).
- Filter by SLA, priority, channel, customer.
- Ticket lifecycle actions.
- AI assist: suggested replies, KB recommendations.
- Collaboration: internal notes, mentions, escalations.

---

## 5. Customer (via Widget)
- Search KB.
- AI chat.
- Submit new tickets.
- Track existing tickets.
- Get SLA-based updates.

---

## 6. AI & Automation
- Widget AI bot trained on KB + tickets.
- Agent assist AI (reply suggestions).
- Workflow AI (auto-tag, auto-assign, escalate).
- Aggression/frustration detection → escalate ticket creation.
- Analytics AI (trends, SLA predictions).

---

## 7. APIs & Integration
- REST + GraphQL.
- Omni-channel inputs:
  - Widget
  - Email parser
  - Web forms
- API consumption for custom CRMs/ERPs.
- Embeddable script for widget:
  ```html
  <script src="https://your-vps.com/widget.js"
          data-api-url="https://your-vps.com/api"
          data-site-id="12345"></script>
8. Tech Stack
Backend: Next.js + Prisma + PostgreSQL

Frontend: Next.js + TailwindCSS

Realtime: WebSockets

Cache: Redis

Queue: BullMQ

Deployment: Docker + Nginx on VPS

AI: OpenAI API + embeddings

9. Development & Workflow (Cursor + Claude)
Backend dev: tickets, workflows, KB, reporting, APIs.

Widget dev: floating widget + APIs consumption.

Shared AI workflow in Cursor IDE:

Use Claude for boilerplate.

Example prompt (backend):
"Generate a Next.js API route to fetch SLA metrics by agent using Prisma."

Example prompt (widget):
"Build a floating chat widget UI in Next.js with TailwindCSS, expandable overlay, connected to /api/tickets."

10. Deliverables
Backend Dev

Admin Panel (HubSpot-style)

Agent Panel

Tickets

Workflows

Analytics

KB

Omnichannel integrations

REST + GraphQL APIs

VPS hosting

Widget Dev

Floating widget bundle

KB + AI + ticket form

Ticket history view

Embeddable script