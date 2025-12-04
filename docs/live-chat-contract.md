# Live Chat Contract: Widget ↔ Server ↔ Admin

This document defines the minimal socket and HTTP contract for the Admin Panel Live Chat MVP. Implement this first so frontends and backends can be built in parallel.

---

## Overview
- Namespace: `/live-chat` (or root namespace with rooms using `conversation:{id}`)
- Transport: Socket.IO (recommended) for presence, ack, rooms; fallback to WebSocket if needed.
- Auth: JWT in socket handshake query param `token` or via `Authorization` header during REST calls. Admin tokens must include role `admin`. Widget connections use a site-scoped token or anonymous conversation token.
- Persistence: PostgreSQL (via Prisma). Messages are persisted before broadcasting where possible (or after ack when using optimistic UI).

---

## Socket handshake
- Client connects to namespace `/live-chat` and supplies token:
  - Example (client):
    const socket = io("/live-chat", { auth: { token: 'Bearer <JWT>' } })
- Server validates token and assigns `socket.user = { id, role, name, siteId }`.
- If auth fails, server emits `auth:error` and disconnects.

Auth success/failed events:
- server -> client: `auth:success` { user: { id, role, name } }
- server -> client: `auth:error` { code, message }

---

## Rooms
- Conversations are represented as rooms: `conversation:{conversationId}`.
- On opening a conversation, admin client joins the room with `join:conversation` event.
- Server enforces authorization when joining (ensure admin has access to that site/customer).

---

## Socket Events (bidirectional)

1) conversation:create
- client -> server
- payload:
  {
    "siteId": "site_abc",
    "metadata": { "source": "widget", "url": "https://..." }
  }
- response ack:
  { "success": true, "conversation": { "id": "c_...", "createdAt": "..." } }

2) join:conversation
- client -> server
- payload: { "conversationId": "c_..." }
- server joins the socket to room `conversation:{id}` and responds with current conversation metadata and participants.
- server -> client (ack): { success: true, conversation: { ... }, messages: [ ...last N messages... ] }

3) message:send
- client -> server
- payload:
  {
    "conversationId": "c_...",
    "clientMessageId": "cid_123", // optional id for optimistic UI
    "content": "Hello, I need help",
    "type": "text", // text|attachment|system
    "metadata": { }
  }
- server behaviour:
  - validate sender & conversation
  - persist message to DB
  - emit to room `conversation:{id}` event `message:new` with persisted message object
- ack to sender:
  { "success": true, "clientMessageId": "cid_123", "message": { "id": "m_...", "createdAt": "..." } }

4) message:new
- server -> clients in room
- payload:
  {
    "id": "m_...",
    "conversationId": "c_...",
    "sender": { "id": "u_...", "type": "customer|agent|system", "name": "..." },
    "content": "...",
    "type": "text",
    "metadata": { },
    "createdAt": "..."
  }

5) typing:start / typing:stop
- client -> server: { conversationId }
- server -> room: { conversationId, user: { id, name }, typing: true|false }

6) presence:update
- server manages presence per-connected socket and periodically emits `presence:update` for a conversation with agent list and statuses.

7) conversation:update
- admin -> server: { conversationId, updates: { status, assigneeId, tags } }
- server applies changes, persists, and emits `conversation:updated` to room and admin consoles.

8) message:edit / message:delete
- admin -> server: { conversationId, messageId, newContent }
- server authorizes (only agents can edit/delete) then persists and emits `message:edited` or `message:deleted`.

9) ack / error responses
- All client events that mutate server state should support an optional acknowledgement. On error, server responds with { success: false, code, message }.

---

## REST endpoints (admin)
These complement sockets for list & pagination, mobile clients, and integrations.

- GET /api/admin/conversations?status=open&cursor=abc&limit=25
  - returns paginated list with lastMessageAt, status, assignee
- GET /api/admin/conversations/:id/messages?limit=50&cursor=...
  - returns messages ordered ascending with pagination
- POST /api/admin/conversations/:id/messages
  - body: { content, type }
  - acts as a fallback to socket message:send; persists and returns the saved message
- POST /api/admin/conversations/:id/actions
  - body: { action: 'assign'|'close'|'tag', payload: {...} }
- GET /api/admin/conversations/:id (fetch conversation metadata)

Auth: `Authorization: Bearer <JWT>` required for admin routes.

---

## Payload shapes (examples)

Message persisted shape (server -> clients):
{
  "id": "m_...",
  "conversationId": "c_...",
  "senderId": "u_...",
  "senderType": "customer",
  "content": "Hi",
  "type": "text",
  "metadata": {},
  "createdAt": "2025-10-17T12:00:00.000Z",
  "editedAt": null
}

Conversation shape:
{
  "id": "c_...",
  "siteId": "site_abc",
  "status": "open",
  "subject": "Optional subject",
  "assigneeId": null,
  "createdAt": "...",
  "updatedAt": "...",
  "lastMessageAt": "..."
}

---

## Auth/Permissions
- Admin sockets must validate JWT and role. Use short-lived JWTs and refresh tokens for admin UI.
- Widget/client sockets can be anonymous: issue a conversation token at conversation creation (server returns token to the widget) and use that for subsequent socket connections limited to that conversation.
- Admins must be authorized for the siteId that the conversation belongs to.

---

## Error codes (example)
- 401: auth_failed
- 403: forbidden
- 404: not_found (conversation/message)
- 409: conflict (duplicate clientMessageId)
- 500: server_error

A mutation ack: { success: false, code: 'auth_failed', message: 'Invalid token' }

---

## Reliability & scaling notes
- Use Redis adapter (`@socket.io/redis-adapter`) for multiple server instances.
- Persist messages synchronously where possible so that broadcasts use persisted data; consider eventual persistence for very high throughput with retry queues.
- Rate-limit message sends per IP/user to avoid abuse.
- Use a queue (BullMQ) for attachments and heavy processing.

---

## Edge cases & recommendations
- Duplicate messages: client can supply `clientMessageId` and server should dedupe.
- Network flaps: clients should support reconnection and resync (fetch messages since last seen message id or timestamp).
- Time sync: clients should rely on server timestamps for ordering.
- Offline/queueing: store messages from anonymous widget users even if no agent present; mark conversation as unassigned.

---

## Next steps after this contract
1. Implement Prisma schema for Conversation/Message and small migrations.
2. Implement socket server route `/pages/api/socket.js` (or `src/server/socket.ts`) that enforces this contract and persists messages.
3. Build admin UI pages that use socket events and REST fallbacks.

