# 🧪 How to Test Live Chat Module

## **Prerequisites**

Make sure you have:
- ✅ Node.js installed
- ✅ MongoDB running (for widget backend)
- ✅ All dependencies installed

---

## **Step 1: Start Widget Backend Server** (REQUIRED)

**Terminal 1:**
```powershell
cd Wzatcowidget\server
npm run dev
```

**Wait for these messages:**
```
✅ MongoDB Connected
✅ Server running on port 5000
✅ Socket.io initialized with Chat Service
```

**Verify it's running:**
- Open: `http://localhost:5000/health`
- Should return: `{"status":"OK",...}`

---

## **Step 2: Start Admin Panel**

**Terminal 2:**
```powershell
npm run dev
```

**Wait for:**
```
✓ Ready on http://localhost:3000
```

---

## **Step 3: Start Customer Widget** (Optional - for testing)

**Terminal 3:**
```powershell
cd Wzatcowidget\client
npm run dev
```

**Wait for:**
```
🌐 Customer Widget: http://localhost:8000
```

---

## **Step 4: Test Live Chat**

### **Method 1: Using Customer Widget (Recommended)**

1. **Open Customer Widget:**
   - Go to: `http://localhost:8000`
   - Look for "Live Chat" or "Start Chat" button

2. **Create a Test Chat:**
   - Fill in:
     - **Name:** John Doe
     - **Email:** john@example.com
     - **Department:** Technical Support
     - **Message:** "Hello, I need help with my projector"
   - Click "Start Chat"

3. **Check Admin Panel:**
   - Go to: `http://localhost:3000/admin/live-chat`
   - You should see the new conversation appear in the list!
   - Click on it to open the chat

4. **Send Messages:**
   - Type a message in the admin panel
   - Click "Send"
   - The message should appear in both admin panel and widget

---

### **Method 2: Using Browser Console (Quick Test)**

1. **Open Admin Panel:**
   - Go to: `http://localhost:3000/admin/live-chat`

2. **Open Browser Console** (F12)

3. **Create a Test Chat via Socket.IO:**
   ```javascript
   // Connect to widget backend
   const socket = io('http://localhost:5000');
   
   socket.on('connect', () => {
     console.log('✅ Connected!');
     
     // Create a test chat
     socket.emit('join_chat', {
       name: 'Test Customer',
       email: 'test@example.com',
       department: 'Technical Support',
       message: 'This is a test message from console'
     });
   });
   
   socket.on('chat_joined', (data) => {
     console.log('Chat created:', data);
   });
   ```

4. **Refresh the Live Chat page** - you should see the new conversation!

---

### **Method 3: Using API Directly (Advanced)**

**Create a chat via API:**
```powershell
# Using PowerShell
$body = @{
    name = "Test Customer"
    email = "test@example.com"
    department = "Technical Support"
    message = "Hello from API test"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/chats" -Method POST -Body $body -ContentType "application/json"
```

---

## **Step 5: Verify Real-Time Updates**

### **Test Real-Time Message Sending:**

1. **Open Admin Panel Live Chat:**
   - `http://localhost:3000/admin/live-chat`
   - Select a conversation

2. **Open Customer Widget:**
   - `http://localhost:8000`
   - Open the same chat

3. **Send Message from Admin:**
   - Type: "Hello from admin!"
   - Click "Send"
   - **Verify:** Message appears in widget immediately

4. **Send Message from Widget:**
   - Type: "Hello from customer!"
   - Click "Send"
   - **Verify:** Message appears in admin panel immediately

---

## **Step 6: Test All Features**

### ✅ **Conversation List:**
- [ ] Conversations appear in sidebar
- [ ] Search works (try searching by name/email)
- [ ] Status badges show correctly (Waiting, Active, etc.)
- [ ] Clicking conversation opens chat

### ✅ **Chat Features:**
- [ ] Messages display correctly
- [ ] Timestamps show properly
- [ ] "Take Chat" button works for waiting chats
- [ ] Sending messages works
- [ ] Real-time updates work (new messages appear instantly)

### ✅ **Socket.IO Connection:**
- [ ] Check browser console for: `✅ Connected to chat server`
- [ ] No connection errors
- [ ] Messages sync in real-time

---

## **Troubleshooting**

### **Issue: "Failed to fetch chats"**

**Solution:**
1. Check if widget backend is running: `http://localhost:5000/health`
2. Check browser console for errors
3. Verify CORS is enabled in widget backend

### **Issue: "Socket.IO connection failed"**

**Solution:**
1. Make sure widget backend is running on port 5000
2. Check browser console for connection errors
3. Verify `WIDGET_BACKEND_URL` in `pages/admin/live-chat.js` is correct

### **Issue: "No conversations showing"**

**Solution:**
1. Create a test chat from widget or console
2. Check MongoDB - verify chats exist in database
3. Check browser console for API errors

### **Issue: "Messages not sending"**

**Solution:**
1. Verify Socket.IO connection is active
2. Check browser console for errors
3. Make sure chat is assigned (click "Take Chat" if needed)

---

## **Quick Test Checklist**

- [ ] Widget backend running (port 5000)
- [ ] Admin panel running (port 3000)
- [ ] Can access `/admin/live-chat`
- [ ] Can see conversation list
- [ ] Can select a conversation
- [ ] Can send messages
- [ ] Real-time updates work
- [ ] Search works
- [ ] Status badges show correctly

---

## **Expected Behavior**

### **When Everything Works:**

1. **New Chat Created:**
   - Appears in conversation list immediately
   - Shows "Waiting" status
   - Has "Take Chat" button

2. **Agent Takes Chat:**
   - Status changes to "Active"
   - "Take Chat" button disappears
   - Chat is assigned to agent

3. **Messages:**
   - Appear instantly in both admin and widget
   - Show correct sender name
   - Show timestamps
   - Auto-scroll to latest message

4. **Real-Time Updates:**
   - New chats appear automatically
   - New messages appear automatically
   - Status changes update automatically

---

## **Success Indicators**

✅ **Console shows:**
```
✅ Connected to chat server
New chat received: {...}
New message received: {...}
```

✅ **UI shows:**
- Conversations list populated
- Messages displaying correctly
- Real-time updates working
- No error messages

---

**Happy Testing! 🚀**

