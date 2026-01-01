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

