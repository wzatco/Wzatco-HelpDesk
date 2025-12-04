# Widget Development Guide (Floating Help Desk Widget)

This guide is for the **Widget Developer**.  
You will deliver the **floating customer widget** that connects to the full help desk backend.

---

## 1. Features
- Floating launcher → chat popup.
- Expand to 90% overlay with sidebar navigation:
  - **Chat**
  - **Tickets** (history from API)
  - **Knowledge Base**
- Collapse back to small popup.
- AI handles conversations → escalate to ticket form.
- Ticket submission → `/api/tickets`.
- Ticket history → `/api/tickets/user`.


---

## 2. Embeddable Script
- Snippet:
  ```html
  <script src="https://your-vps.com/widget.js"
          data-api-url="https://your-vps.com/api"
          data-site-id="12345"></script>

Script auto-injects floating button & UI.

Handles auth/session via backend APIs.

3. APIs Needed

/kb/search

/chat/ai

/tickets/create

/tickets/user

/auth/session

4. WordPress Integration

No plugin.

Just paste <script> in header/footer.

5. Cursor IDE + Claude Workflow

Example widget prompt:
"Build a floating widget in Next.js with TailwindCSS that connects to /api/kb and /api/tickets."

Use AI for:

UI components (chat box, ticket form).

Expand/collapse animations.

API hooks.

Manual review for:

Accessibility.

Mobile responsiveness.

Bundle size (<200kb gzipped).

6. Deliverables

Floating Widget

Expand/collapse overlay

Chat + AI + KB integration

Ticket history view

Ticket form

Embeddable script (served from VPS/CDN)