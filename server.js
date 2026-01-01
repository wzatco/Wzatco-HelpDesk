// Custom Next.js server with Socket.IO support
// Hostinger Cloud Compatible - Robust Port Detection
const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');
const fs = require('fs');
const next = require('next');
const { Server } = require('socket.io');

// ============================================================
// ENVIRONMENT CONFIGURATION - Multi-Source Loading
// ============================================================
// Load environment files based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

// Define environment files to load based on mode
const envFiles = isProduction
  ? ['.env', '.env.production']  // Production: Don't load .env.local
  : ['.env', '.env.development', '.env.local'];  // Development: Load all

envFiles.forEach(file => {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log(`✅ Loaded env from: ${file}`);
  }
});

// ============================================================
// PORT DETECTION - Hostinger Cloud Compatible
// ============================================================
console.log('🚀 Starting Server...');
console.log(`>> Hostinger Assigned Port: ${process.env.PORT || 'Not Set'}`);

// Priority: 1. Hostinger's PORT env var, 2. Fallback to 3000
const port = parseInt(process.env.PORT || '3000', 10);
console.log(`>> Final Binding Port: ${port}`);

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Bind to all interfaces for cloud compatibility
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ============================================================
// SERVER INITIALIZATION
// ============================================================
async function startServer() {
  try {
    await app.prepare();
    console.log('✅ Next.js app prepared successfully');

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

    // Unified Presence System v2.0
    const presenceState = new Map();

    io.on('connection', (socket) => {
      // Presence: Join
      socket.on('presence:join', ({ ticketId, user }) => {
        if (!ticketId || !user?.id) {
          console.warn('⚠️ presence:join: Missing ticketId or user.id');
          return;
        }

        console.log(`🔌 PRESENCE: ${user.name} (${user.role}) joining ticket ${ticketId}`);

        if (!presenceState.has(ticketId)) {
          presenceState.set(ticketId, []);
        }

        const viewers = presenceState.get(ticketId);
        const filtered = viewers.filter(v => v.user.id !== user.id);
        
        filtered.push({
          socketId: socket.id,
          user: { id: user.id, name: user.name, role: user.role }
        });
        
        presenceState.set(ticketId, filtered);

        const roomName = `ticket_presence:${ticketId}`;
        socket.join(roomName);

        const activeViewers = filtered.map(v => v.user);
        io.to(roomName).emit('presence:sync', { activeViewers });

        console.log(`✅ PRESENCE: Synced ${activeViewers.length} viewers to ${roomName}`);
      });

      // Presence: Leave
      socket.on('presence:leave', ({ ticketId, user }) => {
        if (!ticketId || !user?.id) return;

        console.log(`👋 PRESENCE: ${user.name} leaving ticket ${ticketId}`);

        if (presenceState.has(ticketId)) {
          const viewers = presenceState.get(ticketId);
          const filtered = viewers.filter(v => v.user.id !== user.id);
          
          if (filtered.length === 0) {
            presenceState.delete(ticketId);
          } else {
            presenceState.set(ticketId, filtered);
          }

          const roomName = `ticket_presence:${ticketId}`;
          socket.leave(roomName);

          const activeViewers = filtered.map(v => v.user);
          io.to(roomName).emit('presence:sync', { activeViewers });
        }
      });

      // Disconnect: Cleanup presence
      socket.on('disconnect', () => {
        for (const [ticketId, viewers] of presenceState.entries()) {
          const beforeCount = viewers.length;
          const filtered = viewers.filter(v => v.socketId !== socket.id);
          
          if (filtered.length !== beforeCount) {
            const roomName = `ticket_presence:${ticketId}`;
            
            if (filtered.length === 0) {
              presenceState.delete(ticketId);
            } else {
              presenceState.set(ticketId, filtered);
            }

            const activeViewers = filtered.map(v => v.user);
            io.to(roomName).emit('presence:sync', { activeViewers });
            console.log(`✅ PRESENCE: Cleaned up ${roomName}, now ${activeViewers.length} viewers`);
          }
        }
      });
    });

    // Start listening on the detected port
    httpServer.listen(port, hostname, (err) => {
      if (err) throw err;
      console.log('');
      console.log('='.repeat(60));
      console.log(`✅ Server Ready on http://${hostname}:${port}`);
      console.log(`✅ Socket.IO initialized on /api/widget/socket`);
      console.log(`✅ Environment: ${dev ? 'DEVELOPMENT' : 'PRODUCTION'}`);
      console.log(`✅ CORS enabled for: ${dev ? 'localhost:3000, localhost:8000, localhost:8001' : process.env.CLIENT_URL || 'Not Set'}`);
      if (dev) {
        console.log(`ℹ️  Development mode - HMR may show warnings (safe to ignore)`);
      }
      console.log('='.repeat(60));
      console.log('');
    });

  } catch (error) {
    console.error('');
    console.error('❌ FATAL ERROR: Server failed to start');
    console.error('='.repeat(60));
    console.error(error);
    console.error('='.repeat(60));
    process.exit(1);
  }
}

// ============================================================
// START SERVER WITH ERROR HANDLING
// ============================================================
startServer().catch((error) => {
  console.error('');
  console.error('❌ UNHANDLED ERROR: Server startup crashed');
  console.error('='.repeat(60));
  console.error(error);
  console.error('='.repeat(60));
  process.exit(1);
});
