Helpdesk Tool – SLA Management Concept

SLA (Service Level Agreement) Management ensures every support ticket is handled within a predefined time frame, improving customer satisfaction and overall operational efficiency.

⭐ 1. What is SLA in a Helpdesk?

SLA defines the maximum allowed time to respond and resolve customer issues based on their priority or category.
It ensures support teams work with clear expectations and accountability.

⭐ 2. Key Components of SLA
a) Ticket Priority Levels

Common priority types:

Low – Minor impact, informational queries

Medium – Standard issues, moderate impact

High – Major issues affecting usability

Critical/Urgent – Complete service down or severe impact

b) SLA Timers

Each priority has:

Response Time → How soon the support team must acknowledge the ticket

Resolution Time → Maximum time allowed to fully fix the issue

Example:

Priority	Response Time	Resolution Time
Low	8 hours	48 hours
Medium	4 hours	24 hours
High	1 hour	8 hours
Critical	15 mins	4 hours
⭐ 3. SLA Rules / Workflow
Step 1: Ticket Creation

User submits a ticket

Helpdesk auto-detects priority (based on issue type) or agent assigns manually

Step 2: SLA Timer Start

System starts counting down based on priority

Status: Open / New

Step 3: SLA Monitoring

The system checks:

Time left to respond

Time left to resolve

Escalation rules

Step 4: SLA Actions

If response time exceeds → Response SLA breached

If no resolution within timeframe → Resolution SLA breached

Step 5: SLA Escalations

When time is about to end or crossed:

Escalation 1: Notify assigned agent

Escalation 2: Notify team leader

Escalation 3: Notify management

⭐ 4. Automated SLA Features in a Helpdesk Tool

✔ Auto-prioritization based on issue type
✔ Real-time SLA countdown timers on each ticket
✔ Color-coded SLA status indicators

Green = On Track

Yellow = At Risk

Red = Breached

✔ Auto-escalation notifications
✔ Reporting Dashboard (SLA Met vs Breached)
✔ SLA Pause/Stop rules (e.g., waiting for customer reply)

⭐ 5. SLA Pause Logic

Some helpdesks pause SLA timers when:

Ticket is waiting for customer response

Ticket is on hold due to dependency

Non-business hours (if SLA set for business hours only)

⭐ 6. SLA Reports & Insights

Most important metrics:

SLA Met % (How many tickets met SLA)

SLA Breach %

Avg Response Time

Avg Resolution Time

Agent-wise SLA performance

Priority-wise SLA compliance

⭐ 7. Why SLA Management Matters

Ensures timely support

Improves customer satisfaction (CSAT)

Builds trust and reliability

Helps teams identify bottlenecks

Ensures accountability

Increases team performance

________________________________

SLA Management Workflow Builder (Drag & Drop) – Complete Guide

This describes EXACTLY what components/cards should exist, what each card contains, and what data admin must input when they drag each card into the workflow canvas.

✅ 1. Categories of Components (Drag & Drop Cards)

Your SLA Workflow Builder should have 5 main categories:

A. Trigger Components (Start Points)

These define when an SLA should start.

B. Condition Components

These check rules before continuing the workflow.

C. Action Components

These perform automatic tasks like notifications, escalations, time changes.

D. Timer Components

These manage the countdowns (response/resolution).

E. Stop/Pause Components

These stop or pause the SLA timer based on criteria.

🟦 2. Detailed Drag-and-Drop Component List

Below is a full list of all cards your admin will need to build a full SLA workflow.

A) TRIGGER CARDS
1. Ticket Created Trigger

Starts SLA when a new ticket is created.

Admin must configure:

Apply to specific departments? (Yes/No)

Apply to specific categories?

Apply to all or selected priorities?

2. Ticket Priority Updated

Starts or restarts SLA when priority changes.

Admin must configure:

Trigger for which priority updates (e.g., Medium → High)

Restart SLA? (Yes/No)

Continue from previous timer? (Yes/No)

3. Status Changed Trigger

Starts SLA based on ticket status.

Admin options:

Selected statuses to consider (Open, In Progress, Reopened)

Start/Restart/Both

B) CONDITION CARDS
4. Check Priority

Routes logic based on ticket priority.

Admin input:

Priority selections (Low, Medium, High, Critical)

Output paths: Yes / No (branching)

5. Check Department

Used for multi-department helpdesk.

Admin inputs:

Department list

Routing options

6. Check Issue Type / Category

Admin inputs:

Category list

Sub-category list

7. Check Business Hours

Condition: run SLA only in business hours.

Admin inputs:

Business hours schedule

Working days

Exclude holidays (optional)

8. Check Customer Response

If "Waiting for Customer" status → SLA should pause.

Admin inputs:

Status list considered as “waiting”

Pause or continue SLA

C) TIMER CARDS
9. Response Time Timer

Countdown until first response.

Admin inputs:

Hours / Minutes

Business hours toggle

Timezone

Behavior on weekends

10. Resolution Time Timer

Countdown until issue must be resolved.

Admin inputs:

Hours / Minutes

Escalation levels

Restart behavior if priority changes

11. Custom Timer

For advanced workflows.

Admin inputs:

Time duration

Timer name

Timer type (Response / Resolution / Generic)

D) ACTION CARDS
12. Send Email Notification

Sends automated email.

Admin inputs:

Recipient (agent, supervisor, team lead, customer)

Subject

Message template

Attach SLA timers? (Optional)

13. Send SMS/WhatsApp Notification

Same structure as email.

Admin inputs:

Message content

Target group

14. Assign Agent / Team

Auto-routing feature.

Admin inputs:

Select team / user

Round-robin or load-based assignment

Override manually assigned agent? (Yes/No)

15. Update Ticket Priority

Admin inputs:

New priority level

Auto escalation logic

16. Update Ticket Status

Admin assigns a status automatically in workflow.

Admin inputs:

Status selection

Optional comments

17. Create Escalation Event

Trigger alerts if SLA breach predicted or happening.

Admin inputs:

When to escalate (like 80% timer consumed)

Level 1, Level 2, Level 3 escalation

Notification types

Escalation recipients

18. Add Internal Note

Workflow automatically posts notes inside ticket.

Admin inputs:

Message template

Visible to? (agents only / all admins)

E) PAUSE / STOP CARDS
19. Pause SLA

Pauses the SLA timer based on conditions.

Admin inputs:

Pause if status is: Waiting, Customer Reply Pending

Pause if outside business hours (optional)

Pause manually by agents (optional)

20. Resume SLA

Restarts paused timer.

Admin inputs:

Resume when customer responds?

Resume when agent updates status?

21. Stop SLA

Used when ticket is closed or cancelled.

Admin inputs:

Stop SLA for specific statuses

Reopen behavior (restart or continue?)

🧭 3. Example SLA Workflow (Using Cards Above)
[Ticket Created Trigger]
       ↓
[Check Priority]
       ↓(High)
[Start Resolution Timer: 8 hours]
       ↓
[80% Time Passed → Action: Notify Agent]
       ↓
[95% Time Passed → Escalate to Manager]
       ↓
[Status Changed to Waiting for Customer → Pause SLA]
       ↓
[Customer Responded → Resume SLA]
       ↓
[Ticket Closed → Stop SLA]


This is exactly what your admin builder will allow them to design visually.

📌 4. What Data Admin Must Provide for Each Card (Summary Table)
Component	Admin Inputs Required
Trigger Cards	Departments, priorities, categories, restart rules
Conditions	Priority, category, department, business hours, customer status
Timers	Duration, business hour settings, escalation thresholds
Actions	Notifications, recipients, auto-assign rules, escalation levels
Pause/Stop	Status lists, resume rules, reopen behavior
🎨 5. UI/UX Guidelines for Drag & Drop SLA Builder

Components on left panel (Triggers, Conditions, Actions, Timers)

Canvas in center for workflow creation

Right-side properties panel (edit details of selected card)

Connectors between cards (arrows)

Color coding:

🟢 Triggers

🟡 Conditions

🔵 Timers

🟣 Actions

🔴 Pause/Stop

Zoom & pan functionality

Auto-validation (no timer without trigger, no isolated components)

Version history: create, edit, publish SLA workflow

🧩 6. Advanced Features You Can Add

✔ Drag-and-drop cloning
✔ Undo/redo
✔ Preview of expected SLA behavior
✔ Test Run Mode (simulate a ticket)
✔ Export/import workflow JSON
✔ Publish/unpublish (draft mode)