# Knowledge Base Chat Integration - Component Analysis

## Overview
This document identifies all components needed to integrate Knowledge Base article sharing into the chat interface for both Admin/Agent panels and the Customer Widget.

---

## 1. ADMIN/AGENT CHAT INPUT COMPONENTS

### Primary Input Areas:
- **`pages/admin/tickets/[id].js`** (Lines ~3040-3350)
  - **Location**: Message input area in the conversation tab
  - **Structure**: 
    - Textarea with emoji picker, attachment button, macro support
    - Input container: `min-h-[62px] bg-[#f0f2f5] dark:bg-[#202c33]`
    - Icons: Emoji picker, attachment button, send button
  - **Key Features**: 
    - Macro shortcuts (`/shortcut`)
    - Mention autocomplete
    - File attachments
    - Emoji picker

- **`pages/agent/tickets/[id].js`** (Lines ~3270-3350)
  - **Location**: Message input area in the conversation tab
  - **Structure**: Identical to admin version
  - **Key Features**: Same as admin

### Input Button Area Structure:
```javascript
// Located around line 3200-3350 in both files
<div className="min-h-[62px] bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-2 flex items-center gap-2 relative">
  {/* Emoji Picker Button */}
  {/* Attachment Button */}
  {/* Textarea */}
  {/* Send Button */}
</div>
```

---

## 2. MESSAGE RENDERING COMPONENTS

### Admin/Agent Ticket Pages:
- **`pages/admin/tickets/[id].js`** (Lines ~2497-2710)
  - **Message Loop**: `messages.map((message, index) => ...)`
  - **Rendering Location**: Inside `conversationScrollRef` div
  - **Message Types Handled**:
    - Text messages
    - Attachments (via `message.metadata.type`: 'image', 'video', 'file')
    - Reply previews (via `message.replyTo`)
  - **Metadata Structure**:
    ```javascript
    message.metadata = {
      type: 'image' | 'video' | 'file',
      url: string,
      fileName: string
    }
    ```

- **`pages/agent/tickets/[id].js`** (Lines ~2718-2925)
  - **Message Loop**: `messages.map((message, index) => ...)`
  - **Rendering Location**: Inside `conversationScrollRef` div
  - **Message Types Handled**: Same as admin
  - **Metadata Structure**: Same as admin

### Widget Message Rendering:
- **`components/widget/chat/TicketsView.js`** (Lines ~840-1057)
  - **Message Loop**: `ticketDetails.messages.map((message, index) => ...)`
  - **Rendering Location**: Inside ticket conversation view
  - **Message Types Handled**:
    - Text messages
    - Attachments (via `message.metadata`)
    - Reply previews
  - **Note**: This is the widget's ticket conversation view (not the AI chat)

- **`components/widget/chat/ChatInterface.js`** (Lines ~1498-1571)
  - **Message Loop**: `messages.map((message, index) => ...)`
  - **Rendering Location**: AI chat interface
  - **KB Article Rendering**: **ALREADY EXISTS!** (Lines 1545-1571)
    - Renders KB articles when `message.type === 'bot' && message.kbArticles`
    - Shows article cards with title and "View Article →" link
    - Opens articles in new tab: `/knowledge-base/${article.slug}`

---

## 3. WIDGET CHAT INPUT COMPONENTS

### Widget Ticket View:
- **`components/widget/chat/TicketsView.js`** (Lines ~1185-1230)
  - **Location**: Message input in ticket conversation view
  - **Structure**: 
    - Textarea with emoji picker, attachment button
    - WhatsApp-style rounded input
  - **Note**: This is for ticket conversations (customer ↔ agent)

### Widget AI Chat:
- **`components/widget/chat/ChatInterface.js`** (Lines ~1998-2040)
  - **Location**: AI chat input area
  - **Structure**: 
    - Text input (not textarea)
    - Image upload button
    - Send button
  - **Note**: This is for AI chat, not ticket conversations

---

## 4. KNOWLEDGE BASE COMPONENTS

### Agent Knowledge Base Page:
- **`pages/agent/knowledge-base/index.js`** (Lines 1-350)
  - **Purpose**: Read-only KB view for agents
  - **Features**:
    - Search functionality (debounced 500ms)
    - Category filter dropdown
    - Article grid (2-column)
    - "Copy Link" button
    - HTML stripping helper (`getCleanExcerpt`)
  - **API Used**: `/api/public/knowledge-base/articles`
  - **Reusable Logic**:
    - `getCleanExcerpt()` function (lines 11-35) - strips HTML from content
    - Search + category filtering logic
    - Article fetching with debouncing

### Public KB API:
- **`pages/api/public/knowledge-base/articles.js`**
  - **Endpoint**: `/api/public/knowledge-base/articles`
  - **Query Params**: `?search=...&categoryId=...`
  - **Returns**: Array of published articles
  - **Fields**: `id`, `slug`, `title`, `content`, `excerpt`, `category`, etc.

---

## 5. MESSAGE METADATA STRUCTURE

### Current Metadata Format:
```javascript
message.metadata = {
  type: 'image' | 'video' | 'file',
  url: string,
  fileName: string
}
```

### Proposed KB Article Metadata Format:
```javascript
message.metadata = {
  type: 'kb_article',
  articleId: string,
  articleSlug: string,
  articleTitle: string,
  articleExcerpt: string,
  articleUrl: string  // Full URL to public article page
}
```

---

## 6. INTEGRATION POINTS SUMMARY

### Where to Add KB Icon:
1. **Admin Ticket Input**: `pages/admin/tickets/[id].js` (Line ~3200)
   - Add KB icon button next to attachment button
   
2. **Agent Ticket Input**: `pages/agent/tickets/[id].js` (Line ~3270)
   - Add KB icon button next to attachment button

### Where to Render KB Article Cards:
1. **Admin Message Renderer**: `pages/admin/tickets/[id].js` (Line ~2856)
   - Add after attachment preview, before message content
   - Check for `message.metadata.type === 'kb_article'`

2. **Agent Message Renderer**: `pages/agent/tickets/[id].js` (Line ~2856)
   - Add after attachment preview, before message content
   - Check for `message.metadata.type === 'kb_article'`

3. **Widget Ticket View**: `components/widget/chat/TicketsView.js` (Line ~988)
   - Add after attachment preview, before message content
   - Check for `message.metadata.type === 'kb_article'`

### Reusable KB Search Component:
- **Base Component**: `pages/agent/knowledge-base/index.js`
- **Reusable Functions**:
  - `getCleanExcerpt()` - HTML stripping
  - Article fetching logic
  - Search + category filtering
- **Recommendation**: Extract search/filter logic into a shared component or hook

---

## 7. FILE PATHS SUMMARY

### Chat Input Components:
- ✅ **Admin Chat Input**: `pages/admin/tickets/[id].js` (Lines ~3040-3350)
- ✅ **Agent Chat Input**: `pages/agent/tickets/[id].js` (Lines ~3270-3350)
- ✅ **Widget Ticket Input**: `components/widget/chat/TicketsView.js` (Lines ~1185-1230)
- ✅ **Widget AI Chat Input**: `components/widget/chat/ChatInterface.js` (Lines ~1998-2040)

### Message Rendering Components:
- ✅ **Admin Message Renderer**: `pages/admin/tickets/[id].js` (Lines ~2497-2710)
- ✅ **Agent Message Renderer**: `pages/agent/tickets/[id].js` (Lines ~2718-2925)
- ✅ **Widget Ticket Message Renderer**: `components/widget/chat/TicketsView.js` (Lines ~840-1057)
- ✅ **Widget AI Chat Renderer**: `components/widget/chat/ChatInterface.js` (Lines ~1498-1571)
  - **Note**: Already has KB article rendering! (Lines 1545-1571)

### Knowledge Base Components:
- ✅ **Agent KB Page**: `pages/agent/knowledge-base/index.js`
- ✅ **Public KB API**: `pages/api/public/knowledge-base/articles.js`
- ✅ **KB Categories API**: `pages/api/public/knowledge-base/categories.js` (referenced in KB page)

---

## 8. RECOMMENDATIONS

1. **Create Reusable KB Search Modal Component**:
   - Extract search/filter logic from `pages/agent/knowledge-base/index.js`
   - Create `components/shared/KBSearchModal.js`
   - Reuse in both Admin and Agent ticket pages

2. **Create KB Article Card Component**:
   - Create `components/shared/KBArticleCard.js`
   - Reuse in all message renderers (Admin, Agent, Widget)

3. **Message Metadata Extension**:
   - Extend existing `metadata` structure to support `type: 'kb_article'`
   - Follow same pattern as image/video/file attachments

4. **API Endpoint**:
   - Reuse existing `/api/public/knowledge-base/articles`
   - Already supports search and category filtering

---

## 9. NEXT STEPS

1. ✅ Analysis complete
2. ⏳ Create KB Search Modal component
3. ⏳ Create KB Article Card component
4. ⏳ Add KB icon to Admin/Agent input areas
5. ⏳ Add KB article rendering to message bubbles
6. ⏳ Update message sending logic to include KB metadata
7. ⏳ Test in Admin, Agent, and Widget views

