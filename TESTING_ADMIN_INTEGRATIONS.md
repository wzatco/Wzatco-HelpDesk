# Testing Guide: Admin Integrations Page (`/admin/integrations`)

This guide mirrors the Escalation Rules walkthrough and covers everything you need to verify on the **External Integrations** page: Webhook management, API key management, theming, and supporting APIs.

---

## 1. Prerequisites

1. **Database schema** – make sure the latest Prisma models (`Webhook`, `WebhookLog`, `ApiKey`) have been pushed:
   ```bash
   npx prisma db push
   ```
2. **Seed data (optional)** – create at least one ticket so webhook events can fire.
3. **Dev server** – run the admin panel locally:
   ```bash
   npm run dev
   ```
4. **Admin login** – sign in and navigate to `/admin/integrations`.

---

## 2. Page Overview

- **Header**: Puzzle icon, title “External Integrations”, subtitle `Manage webhooks, API keys, and external integrations`.
- **Tabs**: `Webhooks` and `API Keys`. Tabs change the search placeholder and the primary button label, and both inherit hover/active styling for light + dark themes.
- **Search bar**: Filters the currently active list (name + URL for webhooks, name + prefix for keys).
- **Primary CTA**: `Add Webhook` or `Add API Key` depending on the active tab.
- **Custom checkboxes/toggles**: Both the event and scope selectors use themed faux checkboxes so they match Tailwind-based theming even in dark mode. (`pages/admin/integrations/index.js`, multiple instances)

---

## 3. Test Scenarios — Webhooks Tab

### Scenario 3.1: Create a webhook
1. Click `Add Webhook`.
2. Fill out **required** fields: Name, URL, at least one Event.
3. Optional fields to cover:
   - Method (POST/PUT/PATCH)
   - Description
   - Custom headers JSON
   - Secret
   - Retry count (1–10) and Timeout (1000–60000 ms)
4. Leave “Webhook is enabled” checked.
5. Submit — expect toast “Webhook created successfully”, modal closes, list refreshes, item shows green “Enabled” badge.

_Validation references_:  
```230:211:pages/admin/integrations/index.js
    if (webhookFormData.retryCount < 1 || webhookFormData.retryCount > 10) {
      showNotification('error', 'Retry count must be between 1 and 10');
    }
```

### Scenario 3.2: Edit a webhook
1. Click the pencil icon on an existing card.
2. Confirm modal pre-fills `events`, `headers`, etc.
3. Change a field (e.g., Method to PUT), save, and confirm toast + refreshed card.

### Scenario 3.3: Enable/disable toggle
1. Edit a webhook, uncheck “Webhook is enabled”, save.
2. Card badge switches to gray “Disabled”.
3. Reverse to enable.

### Scenario 3.4: Test webhook delivery
1. Click `Test`.
2. Confirm modal shows target URL.
3. Click `Send Test` → toast should include HTTP status (e.g., `Test webhook sent successfully! Status: 200`).
4. After success, expect `_count.logs` value to increase when the page refetches.

### Scenario 3.5: Delete webhook
1. Click trash icon.
2. Confirm modal copy references the webhook name and warns irreversibility.
3. Click Delete → toast + removal from list.

### Scenario 3.6: Empty state
1. If no webhooks exist, confirm the centered card with icon, explanatory text, and CTA “Create Your First Webhook”.

---

## 4. Test Scenarios — API Keys Tab

### Scenario 4.1: Create API key
1. Switch to `API Keys`, click `Add API Key`.
2. Provide Name, select at least one Scope (faux checkboxes similar to webhook events). Available scopes are defined in `AVAILABLE_SCOPES`.  

```48:58:pages/admin/integrations/index.js
const AVAILABLE_SCOPES = [
  'tickets.read', 'tickets.write', ..., '*'
];
```

3. Optionally set an expiration date and toggle enabled state.
4. Submit.
5. Expected behavior:
   - A one-time modal appears showing the generated key.
   - Warning box tells you to store the key.
   - Buttons: reveal/hide, copy, “I’ve Saved It”.
   - After closing, the key list refreshes with:
     - Key name + status badge
     - Prefix preview (`ABCD...`)
     - Scope count, last used timestamp (if any), usage count
     - Expiration date badge if expired.

### Scenario 4.2: Edit key
1. Click pencil icon.
2. Adjust scopes or expiration date; save.
3. Verify toast + updated badges.

### Scenario 4.3: Disable key
1. Edit key, toggle “API Key is enabled” off, save.
2. Badge switches to gray “Disabled”.

### Scenario 4.4: Delete key
1. Trash icon → confirm.
2. Toast and removal from list.

### Scenario 4.5: Search/filter behavior
1. Use search bar to filter by name or prefix fragment.
2. Ensure clearing the search resets the list.

### Scenario 4.6: Empty state
1. When list is empty, confirm the placeholder card mirrors the webhook counterpart.

---

## 5. Theming & UX Checks

| Item | Expectation |
| --- | --- |
| Light/Dark parity | Backgrounds, borders, and text colors switch seamlessly (Tailwind classes already defined). |
| Checkbox styling | Both events & scopes use custom rounded boxes, matching the “checkbox matches theme” requirement. |
| Modals | Body scroll locks (`document.body.style.position = 'fixed'`), blur overlay, rounded-2xl containers. |
| Buttons | All CTAs use violet palette, outlines use slate borders in both themes. |
| Accessibility | Icons have text labels, focusable controls use standard inputs/selects. |

---

## 6. API Coverage & Manual Testing

| Feature | Endpoint | Notes |
| --- | --- | --- |
| List webhooks | `GET /api/admin/integrations/webhooks` | Called on mount and after CRUD ops. |
| Create webhook | `POST /api/admin/integrations/webhooks` | Events sent as JSON string; headers stored as user-supplied JSON. |
| Update webhook | `PATCH /api/admin/integrations/webhooks/[id]` | Same payload shape as creation. |
| Delete webhook | `DELETE /api/admin/integrations/webhooks/[id]` | Hard delete with confirmation. |
| Test webhook | `POST /api/admin/integrations/webhooks/[id]/test` | Returns result status code for toast. |
| List API keys | `GET /api/admin/integrations/api-keys` | Includes `keyPrefix`, `usageCount`, `lastUsedAt`. |
| Create API key | `POST /api/admin/integrations/api-keys` | Returns `apiKey.key` once; UI handles show/copy. |
| Update API key | `PATCH /api/admin/integrations/api-keys/[id]` | Scopes sent as JSON string. |
| Delete API key | `DELETE /api/admin/integrations/api-keys/[id]` | Confirmation modal first. |

You can exercise these endpoints with `curl` or Postman when you need to test beyond the UI (for example, verifying `retryCount` persistence).

---

## 7. Full Regression Checklist

- [ ] Header copy matches design + puzzle icon shows.
- [ ] Tab switching keeps search input + CTA label in sync.
- [ ] Search filters results instantly without extra fetches.
- [ ] Webhook CRUD works end to end, including validation toasts.
- [ ] Webhook event/headers/secret/retry/timeout inputs respect validation ranges and show errors.
- [ ] Webhook `Test` modal fires request and reports status.
- [ ] API key creation reveals key exactly once and enforces scope selection.
- [ ] API key cards show status badge, prefix preview, scope count, last-used timestamp, usage count, expiry tooltip.
- [ ] Delete confirmations block accidental removal.
- [ ] All modals lock background scroll and release it on close.
- [ ] Light + dark modes keep contrast on cards, modals, buttons, faux checkboxes.

---

## 8. Troubleshooting Tips

| Issue | Checks |
| --- | --- |
| Cannot save webhook | Validate URL uses `http(s)://`, ensure at least one event selected, and headers JSON is valid. |
| Webhook test fails | Inspect toast message, confirm endpoint reachable, check server logs for `lib/utils/webhooks.js`. |
| API key modal doesn’t show new key | Confirm the response includes `apiKey.key`; if editing a key, the modal purposely doesn’t appear. |
| Copy button silent | Clipboard API requires a secure context (https or localhost). Use Chrome locally or check devtools for permission errors. |
| Dark mode colors off | Ensure `className` includes both light and dark variants (see card container classes in UI file). |

---

## 9. Expected Outcomes

After following this guide you should be confident that:

1. Webhook CRUD + testing flows are stable and clearly surfaced to admins.
2. API key lifecycle (create, reveal, edit, disable, delete) works with scoped permissions.
3. Search, badges, usage metadata, and empty states behave correctly in both themes.
4. Modal ergonomics (scroll lock, layered overlays, button styles) meet UX standards.
5. Backend endpoints remain in sync with the UI flows, making `/admin/integrations` production-ready.

Happy testing! 🎯


