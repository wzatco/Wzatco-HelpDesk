# Widget UI & Functionality Analysis

## Overview
The widget is a comprehensive customer support portal that provides multiple ways for customers to get help with WZATCO projectors.

## Architecture
- **Widget Type**: Floating chat widget (bottom-right by default)
- **Size**: 384px width × 600px height (w-96 h-[600px])
- **Theme**: Dark mode with purple-pink-red gradient headers
- **Position**: Configurable (bottom-right, bottom-left, top-right, top-left)

---

## User Flow

### 1. Initial State (Not Logged In)
- **Login Screen**:
  - WZATCO logo at top (gradient header: purple → pink → red)
  - Welcome message: "Welcome to Your Support Portal"
  - Tagline: "Quick help. Hassle-free."
  - Form fields:
    - Name (required)
    - Email (required)
  - Submit button: "Continue to Support"
  - Footer: "© WZATCO 2025. All rights reserved."
  - Minimize button (top-right)

### 2. Main Menu (After Login)
- **Header**: 
  - Gradient background (purple → pink → red)
  - "WZATCO Support" title
  - Profile menu button (top-right) with user name/avatar
  - Minimize button

- **Options Grid** (5 main options):
  1. **Knowledge Base** 📚
     - Icon: AcademicCapIcon
     - Description: "Search guides & FAQs"
     - Color: Blue gradient
   
  2. **Live Chat** 💬
     - Icon: ChatBubbleOvalLeftEllipsisIcon
     - Description: "Chat with human agents"
     - Color: Emerald/Green gradient
   
  3. **Projector Tutorials & Guides** 🚀
     - Icon: RocketLaunchIcon
     - Description: "Setup videos, manuals & troubleshooting"
     - Color: Purple/Violet gradient
   
  4. **Schedule Call Back** 📞
     - Icon: PhoneArrowUpRightIcon
     - Description: "Book a callback at your convenience"
     - Color: Orange/Red gradient
   
  5. **Ticket Management** 🎫
     - Icon: ClipboardDocumentListIcon
     - Description: "View and manage your support tickets"
     - Color: Red/Rose gradient

- **UI Features**:
  - Each option is a card with:
    - Gradient icon background
    - Title and description
    - Hover effects (glow, scale, shimmer)
    - Arrow indicator
    - Smooth animations

---

## Feature Details

### 1. Knowledge Base
**Purpose**: Search and browse help articles

**Features**:
- Search bar at top
- Category filters (All, Troubleshooting, Setup, Specifications, etc.)
- Article cards with:
  - Emoji icon
  - Title
  - Category badge
  - Last updated date
  - "Helpful/Not Helpful" buttons
- Scroll to top button
- Article detail view with full content

**UI Elements**:
- Search input with magnifying glass icon
- Category tabs
- Article grid/list
- Helpful feedback buttons

---

### 2. Live Chat
**Purpose**: Real-time chat with support agents

**Features**:
- **Department Selection** (first step):
  - Technical Support 🔧
  - Sales Support 💼
  - General Support 📋
  - Each shows agent name and avatar

- **Chat Interface**:
  - Header with:
    - Back button
    - "Live Chat" title
    - Agent info (avatar, name, "Online" status)
    - Trash icon (delete chat)
  
  - Message area:
    - Customer messages (right-aligned, blue background)
    - Agent messages (left-aligned, gray background)
    - Timestamps
    - Typing indicator
  
  - Input area:
    - Message input field
    - Send button
    - Attachment support (optional)

- **Socket.IO Events**:
  - `join_chat` - Customer joins with name, email, department, message
  - `send_message` - Customer sends message
  - `new_message` - Receive messages from agent
  - `agent_joined` - Agent joins chat
  - `chat_joined` - Confirmation of chat creation

- **Functionality**:
  - Auto-reconnect on disconnect
  - Message persistence (localStorage)
  - Real-time message updates
  - Leave chat confirmation
  - Rating modal after chat ends

---

### 3. Projector Tutorials & Guides
**Purpose**: Educational content for projector setup and troubleshooting

**Features**:
- Video tutorials
- Step-by-step guides
- Manual downloads
- Troubleshooting guides
- Back button to main menu

**UI Elements**:
- Video player
- Guide cards
- Download buttons
- Category navigation

---

### 4. Schedule Call Back
**Purpose**: Book a phone callback at preferred time

**Features**:
- **Two Tabs**: "Schedule" and "Manage"
  
- **Schedule Tab**:
  - Time picker dropdown:
    - Tomorrow, 8:00 AM
    - Tomorrow, 9:00 AM
    - ... up to 5:00 PM
  - Phone number input:
    - Country code selector (+91)
    - 10-digit phone number
    - Validation (must start with 6, 7, 8, or 9)
  - "Schedule Call" button
  - Success popup after scheduling

- **Manage Tab**:
  - List of scheduled callbacks
  - Each shows:
    - Scheduled time
    - Phone number
    - Status (scheduled, completed, cancelled)
  - Actions:
    - Cancel callback
    - Reschedule callback
  - Empty state when no callbacks

**UI Elements**:
- Tab switcher
- Time dropdown
- Phone input with validation
- Callback list
- Action buttons

---

### 5. Ticket Management
**Purpose**: Create, view, and manage support tickets

**Features**:
- **Ticket List View**:
  - All user's tickets
  - Status badges (Open, In Progress, Resolved, Closed)
  - Priority indicators
  - Last updated date
  - Quick actions (View, Reply)

- **Create Ticket**:
  - Form fields:
    - Subject/Title
    - Priority (Low, Medium, High, Urgent)
    - Category
    - Name
    - Phone Number
    - Order Number
    - Purchased From
    - Description
    - File attachments
  - OTP verification (for ticket creation)
  - Success confirmation

- **Ticket Detail View**:
  - Full ticket information
  - Status and priority
  - Conversation/thread
  - Add comments/replies
  - Attach files
  - Update status
  - Export ticket

- **OTP System**:
  - Email verification required for ticket access
  - 6-digit code sent to email
  - Resend option
  - Session-based (once per day)

**UI Elements**:
- Ticket cards
- Create ticket button
- Ticket detail modal
- Comment thread
- File upload
- Status dropdown
- Export button

---

### 6. Profile Management
**Purpose**: Manage customer profile and account settings

**Features**:
- View profile information
- Edit details
- Account settings
- Logout option

**UI Elements**:
- Profile form
- Edit/Save buttons
- Settings toggles

---

## Additional Features

### Profile Menu
- User avatar/initials
- User name
- Dropdown with:
  - Profile option
  - Logout option

### Modals & Popups
1. **OTP Verification Modal**:
   - Email verification for ticket access
   - 6-digit code input
   - Resend option

2. **Rating Modal**:
   - 3 options: Not Satisfied, Okay, Satisfied
   - Feedback text area
   - Submit/Skip buttons
   - Shown after chat ends

3. **Leave Chat Confirmation**:
   - "Are you sure you want to leave?"
   - Stay/Leave buttons

### Animations
- Framer Motion for page transitions
- Hover effects on cards
- Smooth scale/opacity transitions
- Loading states
- Shimmer effects

### State Management
- localStorage for:
  - User session
  - Chat messages
  - Scheduled callbacks
  - Tickets (local cache)

---

## Technical Requirements for Next.js Rebuild

### Stack (Same as Admin Panel)
- **Framework**: Next.js 15
- **Database**: PostgreSQL (Prisma)
- **Styling**: Tailwind CSS
- **Real-time**: Socket.IO
- **Icons**: Lucide React (instead of Heroicons)

### Database Models Needed
1. **Customer** (already exists)
2. **LiveChat** (already exists)
3. **LiveChatMessage** (already exists)
4. **Ticket** (use existing Conversation model or create Ticket model)
5. **ScheduledCallback** (new model)
6. **KnowledgeBaseArticle** (already exists)
7. **Tutorial** (new model or use KnowledgeBase)

### API Routes Needed
- `/api/widget/auth/login` - Customer login
- `/api/widget/chats` - Chat management (already exists)
- `/api/widget/tickets` - Ticket CRUD
- `/api/widget/callbacks` - Schedule/manage callbacks
- `/api/widget/knowledge` - Knowledge base search
- `/api/widget/tutorials` - Tutorial content
- `/api/widget/profile` - Profile management
- `/api/widget/otp` - OTP send/verify

### Socket.IO Events
- `join_chat` - Customer joins chat
- `send_message` - Send message
- `new_message` - Receive message
- `agent_joined` - Agent joins
- `chat_joined` - Chat created

### Pages/Components Structure
```
pages/
  widget/
    index.js - Main widget page
    chat.js - Live chat view
    tickets.js - Ticket management
    knowledge.js - Knowledge base
    tutorials.js - Tutorials
    callbacks.js - Schedule callbacks
    profile.js - Profile management

components/
  widget/
    WidgetContainer.js - Main wrapper
    LoginScreen.js - Login form
    MainMenu.js - Options grid
    ProfileMenu.js - Profile dropdown
    LiveChat.js - Chat interface
    TicketList.js - Ticket list
    TicketForm.js - Create ticket
    KnowledgeBase.js - KB search
    CallbackScheduler.js - Schedule callbacks
    TutorialViewer.js - Tutorials
    RatingModal.js - Rating popup
    OTPModal.js - OTP verification
```

---

## UI Design Specifications

### Colors
- **Primary Gradient**: `from-purple-700 via-pink-600 to-red-600`
- **Background**: Black (`bg-black`)
- **Cards**: Dark gray with gradients
- **Text**: White for headers, gray for descriptions

### Typography
- Headers: Bold, white
- Descriptions: Medium, gray-400
- Body: Regular, white/gray

### Spacing
- Padding: p-5 sm:p-6
- Gap between cards: gap-4
- Border radius: rounded-2xl

### Animations
- Page transitions: 0.3s ease-out
- Hover effects: scale, glow, shimmer
- Loading states: pulse, spin

---

## Next Steps
1. Create Prisma models for missing entities
2. Build API routes
3. Create widget components
4. Integrate Socket.IO
5. Style with Tailwind CSS
6. Test all features

