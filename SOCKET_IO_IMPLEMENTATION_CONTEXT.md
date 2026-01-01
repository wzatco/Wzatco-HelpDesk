# Socket.IO Implementation Context

## 1. Database Schema

### Conversation (Ticket) Model
```prisma
model Conversation {
  id            String    @id @default(cuid())
  siteId        String
  status        String    @default("open")
  subject       String?
  assigneeId    String?
  customerId    String?
  departmentId  String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastMessageAt DateTime?
  category      String?   @default("WZATCO")
  customerName  String?   // ⚠️ Note: customerName is stored here, not always in Customer relation
  priority      String?   @default("low")
  assignee      Agent?    @relation(fields: [assigneeId], references: [id])
  customer      Customer? @relation(fields: [customerId], references: [id])
  department    Department? @relation(fields: [departmentId], references: [id])
  messages      Message[]
}
```

**Key Fields:**
- `id` - Ticket ID (String, cuid)
- `customerId` - Reference to Customer (can be null)
- `customerName` - Direct name field (String, can be null)
- `assigneeId` - Reference to Agent (can be null)
- `lastMessageAt` - DateTime for last message timestamp

### Message Model
```prisma
model Message {
  id              String       @id @default(cuid())
  conversationId  String
  senderId        String?      // ⚠️ Can be Customer ID or Admin ID (String, nullable)
  senderType      String       // ⚠️ Values: "customer", "admin", "agent"
  content         String
  type            String       @default("text")
  metadata        Json?        // Can store attachments, replyTo, etc.
  createdAt       DateTime     @default(now())
  editedAt        DateTime?
  clientMessageId String?      // For optimistic UI updates
  Conversation    Conversation @relation(fields: [conversationId], references: [id])
  attachments     Attachment[]
}
```

**Key Fields:**
- `id` - Message ID (String, cuid)
- `conversationId` - Ticket ID (String)
- `senderId` - Sender ID (String?, nullable - can be Customer.id or Admin.id)
- `senderType` - Type: "customer", "admin", or "agent" (String)
- `content` - Message text (String)
- `metadata` - JSON field for attachments, replyTo, etc. (Json?)
- ⚠️ **NO `senderName` field** - Name must be fetched from Customer/Admin/Agent tables

### Customer Model
```prisma
model Customer {
  id            String   @id @default(cuid())
  name          String
  email         String?  @unique
  phone         String?
  company       String?
  location      String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  conversations Conversation[]
}
```

**Key Fields:**
- `id` - Customer ID (String, cuid)
- `name` - Customer name (String)
- `email` - Customer email (String?, unique, nullable)

### Admin Model
```prisma
model Admin {
  id        String   @id @default(cuid())
  name      String
  email     String?  @unique
  password  String?
  phone     String?
  role      String?  @default("Admin")
  avatarUrl String?
  bio       String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Key Fields:**
- `id` - Admin ID (String, cuid)
- `name` - Admin name (String)
- `email` - Admin email (String?, unique, nullable)
- `avatarUrl` - Avatar URL (String?, nullable)

### Agent Model
```prisma
model Agent {
  id                    String         @id @default(cuid())
  userId                String?        @unique
  accountId             String?        @unique
  account               User?          @relation(fields: [accountId], references: [id])
  name                  String
  email                 String?        @unique
  slug                  String         @unique
  departmentId          String?
  department            Department?    @relation(fields: [departmentId], references: [id])
  roleId                String?
  role                  Role?          @relation(fields: [roleId], references: [id])
  skills                String?        // JSON array
  isActive              Boolean        @default(true)
  presenceStatus        String         @default("offline")
  lastSeenAt            DateTime?
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt
  assignedConversations Conversation[]
}
```

**Key Fields:**
- `id` - Agent ID (String, cuid)
- `name` - Agent name (String)
- `email` - Agent email (String?, unique, nullable)

---

## 2. Authentication/Identity

### Admin Side Authentication

**Location:** `pages/admin/tickets/[id].js`

**How Admin Identity is Determined:**

```javascript
// State variable
const [adminProfile, setAdminProfile] = useState({ name: 'Admin', avatarUrl: null });

// Fetch admin profile from API
useEffect(() => {
  fetch('/api/admin/profile')
    .then(res => res.json())
    .then(data => {
      if (data?.data) {
        const adminName = data.data.name || 'Admin';
        const adminId = data.data.id || 'admin';
        const adminAvatar = data.data.avatarUrl || null;
        setAdminProfile({ name: adminName, avatarUrl: adminAvatar });
      }
    });
}, []);
```

**API Endpoint:** `GET /api/admin/profile`

**Response Format:**
```javascript
{
  data: {
    id: "clx...",           // Admin ID (String)
    name: "Admin Name",     // Admin name (String)
    email: "admin@wzatco.com",
    avatarUrl: "/api/uploads/avatars/admin_xxx.png" | null,
    // ... other fields
  }
}
```

**Authentication Method:**
- Uses **HTTP-only cookie** (`authToken`) set during login
- Cookie is verified server-side in API routes
- No localStorage for sensitive data (only for UI preferences)

**Code Reference:**
```272:281:pages/admin/tickets/[id].js
    fetch('/api/admin/profile')
      .then(res => res.json())
      .then(data => {
        if (data?.data) {
          adminName = data.data.name || 'Admin';
          adminId = data.data.id || 'admin';
          adminAvatar = data.data.avatarUrl || null;
          // Store admin profile for use in messages
          setAdminProfile({ name: adminName, avatarUrl: adminAvatar });
        }
      })
```

### Widget Side (Customer) Authentication

**Location:** `components/widget/chat/TicketsView.js`

**How Customer Identity is Determined:**

```javascript
// Component receives userInfo as prop
export default function TicketsView({ userInfo, onBack }) {
  // userInfo structure:
  // {
  //   name: "Customer Name",
  //   email: "customer@example.com"
  // }
}
```

**Source of userInfo:**
- Passed as **prop** from parent component (`WidgetContainer`)
- Stored in **localStorage** as `'widget-user'` (JSON string)
- Format: `{ name: string, email: string, loginTime: string }`

**Code Reference:**
```9:9:components/widget/chat/TicketsView.js
export default function TicketsView({ userInfo, onBack }) {
```

**Parent Component (WidgetContainer):**
```javascript
// From components/widget/WidgetContainer.js
const [userInfo, setUserInfo] = useState({ name: '', email: '' });

// Load from localStorage on mount
useEffect(() => {
  const savedUser = localStorage.getItem('widget-user');
  if (savedUser) {
    const user = JSON.parse(savedUser);
    setUserInfo({ name: user.name, email: user.email });
  }
}, []);

// Passed to TicketsView
<TicketsView userInfo={userInfo} onBack={handleBack} />
```

**⚠️ Important Notes:**
- Customer **email** is used to find Customer record in database
- Customer **name** comes from `userInfo.name` prop (from localStorage)
- If Customer record exists, use `Customer.name` from DB
- If not, use `userInfo.name` from localStorage

---

## 3. Server Initialization

### Socket.IO Server Setup

**File:** `server.js` (root directory)

**Initialization Code:**
```1:52:server.js
// Custom Next.js server with Socket.IO support
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    
    // Let Next.js handle all routes including HMR
    // Socket.IO will handle its own paths via the Server instance
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.IO BEFORE attaching to server
  const io = new Server(httpServer, {
    path: '/api/widget/socket',
    cors: {
      origin: dev
        ? ['http://localhost:3000', 'http://localhost:8000', 'http://localhost:8001']
        : process.env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Initialize chat service
  const { initialize } = require('./lib/chat-service');
  initialize(io);

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO initialized on /api/widget/socket`);
    console.log(`> CORS enabled for: http://localhost:3000, http://localhost:8000, http://localhost:8001`);
    if (dev) {
      console.log(`> Development mode - HMR may show warnings (safe to ignore)`);
    }
  });
});
```

**Key Configuration:**
- **Path:** `/api/widget/socket`
- **CORS:** Enabled for localhost:3000, 8000, 8001 (dev) or `CLIENT_URL` (prod)
- **Transports:** `['websocket', 'polling']`
- **Chat Service:** Initialized via `lib/chat-service.js`

**Chat Service Initialization:**
```javascript
// lib/chat-service.js
class ChatService {
  constructor() {
    this.io = null;
  }

  initialize(io) {
    this.io = io;
    console.log('💬 Chat Service initialized');

    io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      // Socket handlers go here
    });
  }
}
```

---

## 4. File Paths

### Admin Chat Component
**Path:** `pages/admin/tickets/[id].js`

**Component Name:** `TicketViewPage`

**Key State Variables:**
```javascript
const [messages, setMessages] = useState([]);
const [newMessage, setNewMessage] = useState('');
const [sendingMessage, setSendingMessage] = useState(false);
const [adminProfile, setAdminProfile] = useState({ name: 'Admin', avatarUrl: null });
const socketRef = useRef(null);
```

**Socket Reference:**
- Uses `useSocket` hook from `src/hooks/useSocket.js`
- Socket ref: `socketRef.current`

### Widget Chat Component
**Path:** `components/widget/chat/TicketsView.js`

**Component Name:** `TicketsView`

**Props:**
```javascript
export default function TicketsView({ userInfo, onBack }) {
  // userInfo: { name: string, email: string }
  // onBack: () => void
}
```

**Key State Variables:**
```javascript
const [ticketDetails, setTicketDetails] = useState(null);
const [newMessage, setNewMessage] = useState('');
const [sendingMessage, setSendingMessage] = useState(false);
const socketRef = useRef(null);
```

**Socket Connection:**
- Direct Socket.IO client connection (not via hook)
- Path: `/api/widget/socket`

### Backend Socket Handler
**Path:** `lib/chat-service.js`

**Class:** `ChatService`

**Initialization:**
- Exported function: `initialize(io)`
- Called from `server.js` on startup

---

## 5. Important Notes for Implementation

### Field Name Conventions
- ✅ Use **camelCase**: `senderId`, `senderType`, `conversationId`
- ✅ **NO** `senderName` field in Message model - must fetch from related tables
- ✅ Use `customerName` field in Conversation model as fallback
- ✅ `senderType` values: `"customer"`, `"admin"`, `"agent"`

### Identity Resolution
1. **Admin Messages:**
   - `senderId` = Admin.id
   - `senderType` = "admin"
   - `senderName` = Fetch from `Admin.name` (via `senderId`)

2. **Customer Messages:**
   - `senderId` = Customer.id
   - `senderType` = "customer"
   - `senderName` = Fetch from `Customer.name` (via `senderId`) OR use `Conversation.customerName` as fallback

3. **Agent Messages:**
   - `senderId` = Agent.id
   - `senderType` = "agent" or "admin" (check your logic)
   - `senderName` = Fetch from `Agent.name` (via `senderId`)

### Socket.IO Path
- **Server Path:** `/api/widget/socket`
- **Client Connection:** `io({ path: '/api/widget/socket' })`
- **Room Naming:** `ticket_${ticketId}` (e.g., `ticket_clx123abc`)

### Authentication Tokens
- **Admin:** HTTP-only cookie (`authToken`) - verified server-side
- **Customer:** Email-based (no token, just email in localStorage)
- **Socket Auth:** Currently no authentication on socket connection (to be implemented)

---

## Summary Checklist for Implementation

- [ ] Use `conversationId` (not `ticketId`) when querying Message model
- [ ] Fetch `senderName` from related tables (Customer/Admin/Agent) - don't assume it's in Message
- [ ] Admin identity: Fetch from `/api/admin/profile` API
- [ ] Customer identity: Use `userInfo` prop (from localStorage)
- [ ] Socket path: `/api/widget/socket`
- [ ] Room format: `ticket_${conversationId}`
- [ ] Field names: camelCase (`senderId`, `senderType`, `conversationId`)
- [ ] No `senderName` in Message model - must resolve from senderId + senderType

