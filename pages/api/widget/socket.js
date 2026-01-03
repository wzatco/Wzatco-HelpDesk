// Widget Socket.IO API Route for Hostinger
// This creates the Socket.IO server for widget communication
import { Server } from 'socket.io';
import prisma from '../../../lib/prisma';

// Store io instance globally to avoid multiple initializations
let io;

export default async function handler(req, res) {
  // Initialize Socket.IO server if not already initialized
  if (!res.socket.server.io) {
    console.log('🔌 Initializing Widget Socket.IO server...');
    
    io = new Server(res.socket.server, {
      path: '/api/widget/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
      },
      transports: ['polling', 'websocket'],
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 30000,
      maxHttpBufferSize: 1e8,
      allowUpgrades: true,
      perMessageDeflate: false,
      httpCompression: false
    });

    res.socket.server.io = io;

    // Socket.IO connection handler
    io.on('connection', async (socket) => {
      console.log('✅ Widget socket connected:', socket.id);
      
      const { token, email, customerId } = socket.handshake.auth || {};
      
      // Store user info in socket
      socket.userId = customerId;
      socket.userEmail = email;
      
      // Join user-specific room for targeted messages
      if (customerId) {
        socket.join(`customer:${customerId}`);
        console.log(`📌 Customer ${customerId} joined room`);
      }

      // Handle joining ticket room
      socket.on('join:ticket', (ticketNumber) => {
        socket.join(`ticket:${ticketNumber}`);
        console.log(`📌 Socket ${socket.id} joined ticket room: ${ticketNumber}`);
      });

      // Handle leaving ticket room
      socket.on('leave:ticket', (ticketNumber) => {
        socket.leave(`ticket:${ticketNumber}`);
        console.log(`📌 Socket ${socket.id} left ticket room: ${ticketNumber}`);
      });

      // Handle new message
      socket.on('message:send', async (data) => {
        try {
          const { ticketNumber, content, senderType } = data;
          
          // Broadcast to ticket room
          io.to(`ticket:${ticketNumber}`).emit('message:created', {
            ticketNumber,
            content,
            senderType,
            createdAt: new Date().toISOString()
          });
          
          console.log(`📨 Message sent to ticket ${ticketNumber}`);
        } catch (error) {
          console.error('Error handling message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle typing indicator
      socket.on('typing:start', ({ ticketNumber }) => {
        socket.to(`ticket:${ticketNumber}`).emit('typing:indicator', {
          ticketNumber,
          isTyping: true,
          userId: socket.userId
        });
      });

      socket.on('typing:stop', ({ ticketNumber }) => {
        socket.to(`ticket:${ticketNumber}`).emit('typing:indicator', {
          ticketNumber,
          isTyping: false,
          userId: socket.userId
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log('❌ Widget socket disconnected:', socket.id);
      });
    });

    console.log('✅ Widget Socket.IO server initialized');
  } else {
    console.log('♻️ Widget Socket.IO server already running');
  }

  res.status(200).json({ success: true, message: 'Socket.IO server running' });
}

