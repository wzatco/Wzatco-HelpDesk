Perfect. Below is a **complete, implementation-ready blueprint**.
You can hand this directly to a product manager, designer, or developer.

---

# 1. Ticket State Diagram (Lifecycle + Leave Handling)

### Ticket States

```
NEW
 ↓
OPEN
 ↓
IN_PROGRESS
 ↓
WAITING_ON_CUSTOMER
 ↓
RESOLVED
 ↓
CLOSED
```

### Parallel Control Flags (important)

These are **not states**, they are flags:

* `assigned_agent_id`
* `previous_owner_id`
* `claimable (true/false)`
* `owner_status (ACTIVE | ON_LEAVE)`

---

### State Flow with Leave

```
Agent ACTIVE
   │
   ├── Agent marks ON_LEAVE
   │
   ├── All OPEN / IN_PROGRESS / WAITING tickets
   │        ├─ assigned_agent_id → NULL
   │        ├─ claimable → TRUE
   │        ├─ previous_owner_id → Agent
   │
   └── Ticket remains OPEN / IN_PROGRESS
```

```
Customer calls support
   │
   ├─ Any agent searches ticket
   ├─ Read access allowed
   ├─ Call logged
   │
   ├─ Agent decides:
   │      ├─ Resolve → RESOLVED
   │      ├─ Claim → IN_PROGRESS (new owner)
   │      └─ Reassign → OPEN (new owner)
```

```
Original agent returns
   │
   ├─ Status → ACTIVE
   ├─ No auto reassignment
   └─ Optional manual reclaim if unowned
```

---

# 2. Permission Matrix (Very Important)

| Role / Action             | View Ticket | Read Conversation | Reply Customer | Log Call | Claim Ticket | Reassign | Resolve |
| ------------------------- | ----------- | ----------------- | -------------- | -------- | ------------ | -------- | ------- |
| Assigned Agent (Active)   | ✅           | ✅                 | ✅              | ✅        | ❌            | ✅        | ✅       |
| Same Team Agent           | ✅           | ✅                 | ⚠️ Limited     | ✅        | ✅            | ❌        | ⚠️      |
| Agent (Other Team)        | ⚠️ Basic    | ⚠️ Read-only      | ❌              | ❌        | ❌            | ❌        | ❌       |
| Team Lead                 | ✅           | ✅                 | ✅              | ✅        | ✅            | ✅        | ✅       |
| Admin                     | ✅           | ✅                 | ✅              | ✅        | ✅            | ✅        | ✅       |
| Assigned Agent (On Leave) | ❌           | ❌                 | ❌              | ❌        | ❌            | ❌        | ❌       |

### Notes

* ⚠️ Limited reply = one-time reply or internal note only
* On-leave agents **lose access completely**

---

# 3. Database-Level Logic (Clean & Scalable)

### Core Tables

#### `users`

```
id
name
role (agent, lead, admin)
team_id
status (ACTIVE, ON_LEAVE)
leave_from
leave_to
```

#### `tickets`

```
id
ticket_number
customer_id
team_id
status
assigned_agent_id (NULLABLE)
previous_owner_id
claimable (BOOLEAN)
created_at
updated_at
```

#### `ticket_activity_log`

```
id
ticket_id
action_type
performed_by
metadata (JSON)
created_at
```

#### `call_logs`

```
id
ticket_id
agent_id
call_time
summary
created_at
```

---

### On Leave Trigger (Pseudo Logic)

```
IF user.status = ON_LEAVE:
   FOR each ticket WHERE assigned_agent_id = user.id
      AND status IN (OPEN, IN_PROGRESS, WAITING):
         assigned_agent_id = NULL
         claimable = TRUE
         previous_owner_id = user.id
         log("Ticket released due to leave")
```

---

### Search Logic (Critical)

```
Agent searches by ticket_id OR email OR phone

IF ticket found:
   IF agent.team_id == ticket.team_id:
       grant READ access
   ELSE:
       grant BASIC metadata only
```

---

### Claim Ticket Logic

```
IF ticket.claimable = TRUE
AND agent.status = ACTIVE
AND agent.team_id = ticket.team_id:
   assigned_agent_id = agent.id
   claimable = FALSE
   status = IN_PROGRESS
```

---

### Agent Returns from Leave

```
user.status = ACTIVE

NO ticket auto reassignment

Show leave summary dashboard
```

---

# 4. Real UI Text (Exact Copy You Can Use)

## Agent Status

* Button: **Mark as On Leave**
* Badge: `On Leave`
* Tooltip:

  > You will temporarily lose access to your assigned tickets.
  > Your tickets will be available to your team.

---

## Ticket Badges

* `Owner On Leave`
* `Claimable`
* `Assisted During Call`
* `Previously Owned by Rahul`

---

## Claim Ticket Button

**Button:** `Claim Ticket`

**Confirmation Modal:**

> This ticket was previously assigned to another agent who is on leave.
> Do you want to take ownership?

Buttons:

* Cancel
* Claim

---

## Read-Only Access Warning

Displayed at top of ticket:

> You are viewing this ticket in read-only mode.
> Claim the ticket to take full action.

---

## Call Logging UI

Fields:

* Call Duration
* Call Summary
* Action Taken
* Next Step

Label:

> Logged during customer call

---

## Agent Return Summary

Title: **While You Were Away**

Sections:

* Tickets Reassigned
* Tickets Resolved by Team
* Tickets Still Unassigned

Message:

> Your tickets were handled by the team to avoid customer delays.

---

## Reclaim Option (Optional)

Button: `Request Reclaim`

Tooltip:

> This ticket is currently unassigned and can be reclaimed.

---

# Final Design Principle (Non-Negotiable)

* Tickets belong to **teams first**, agents second
* Leave never blocks customers
* Read access is broader than write access
* Ownership changes are **explicit, never automatic**

---

If you want, next I can:

* Convert this into **API contracts**
* Design **SLA + escalation rules**
* Create **UI wireframe text-only screens**
* Or align this with tools like Zendesk/Freshdesk logic

Just say the word.
