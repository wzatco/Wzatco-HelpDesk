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

