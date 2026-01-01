# 🚀 Start Widget Backend Server

## **The Problem:**
WebSocket connection to `ws://localhost:5000` is failing because the widget backend server is **not running**.

## **The Solution:**

### **Step 1: Start Widget Backend**

Open a **new terminal** and run:

```powershell
cd Wzatcowidget\server
npm run dev
```

### **Step 2: Wait for These Messages:**

You should see:
```
✅ MongoDB Connected
✅ Server running on port 5000
✅ Socket.io initialized with Chat Service
💬 Chat Service initialized
```

### **Step 3: Verify It's Running**

Open another terminal and check:
```powershell
curl http://localhost:5000/health
```

Should return: `{"status":"OK",...}`

### **Step 4: Test Widget Again**

1. Refresh: `http://localhost:8000/customer-widget-demo`
2. Click "Live Chat"
3. Check browser console - should see: `✅ Widget: Socket.io connected!`

---

## **Quick Start Command:**

```powershell
cd Wzatcowidget\server && npm run dev
```

---

## **If MongoDB Connection Fails:**

Make sure MongoDB is running:
- If using local MongoDB: Start MongoDB service
- If using MongoDB Atlas: Check connection string in `.env`

---

**Once the backend is running, the WebSocket connection will work!** ✅

