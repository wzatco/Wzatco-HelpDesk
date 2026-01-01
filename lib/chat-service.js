// Chat Service for Next.js - handles live chat logic with Prisma
const { PrismaClient } = require('@prisma/client');

// Use global singleton from lib/prisma.js if available, otherwise create one
let prisma;
if (global.prisma) {
  prisma = global.prisma;
} else if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  global.prisma = new PrismaClient();
  prisma = global.prisma;
}

class ChatService {
  constructor() {
    // Use global.io to share Socket.IO instance across dynamic imports
    this.io = global.io || null;
  }

  initialize(io) {
    // Store io in global scope for singleton access across Next.js API routes
    if (io) {
      global.io = io;
      this.io = io;
    } else {
      // API routes calling initialize() without io parameter - use global.io
      this.io = global.io;
    }
    
    // Only set up event listeners if we have a valid io instance and it's being initialized for the first time
    if (!this.io) {
      console.warn('⚠️ ChatService initialize called but no Socket.IO instance available');
      return;
    }
    
    // Only set up listeners if io parameter was provided (server.js initialization)
    if (!io) {
      console.log('💬 Chat Service singleton accessed');
      return;
    }
    
    console.log('💬 Chat Service initialized');

    // ===== AUTHENTICATION MIDDLEWARE =====
    // This runs BEFORE the connection handler, authenticating users and setting socket.user
    this.io.use(async (socket, next) => {
      const token = socket.handshake.auth?.token;
      
      // If no token, allow connection (might be widget/customer without auth)
      if (!token) {
        console.log(`⚠️ [Auth Middleware] No token for ${socket.id} - allowing connection (widget/customer)`);
        socket.user = { type: 'customer' }; // Default to customer for widget connections
        return next();
      }

      try {
        const jwt = require('jsonwebtoken');
        const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        const decoded = jwt.verify(token, secret);
        
        console.log(`✅ [Auth Middleware] Token decoded for ${socket.id}:`, JSON.stringify(decoded, null, 2));

        // 1. Handle Internal Agents (Existing)
        if (decoded.type === 'agent' && (decoded.id || decoded.agentId)) {
          const agentId = decoded.id || decoded.agentId;
          socket.user = {
            id: agentId,
            type: 'agent',
            name: decoded.name,
            email: decoded.email,
            departmentId: decoded.departmentId
          };
          console.log(`👤 [Auth Middleware] Agent authenticated: ${agentId}`);
          return next();
        }

        // 2. Handle Internal Admins (NEW - Fixes the issue)
        if (decoded.type === 'admin' && (decoded.adminId || decoded.userId)) {
          const adminId = decoded.adminId || decoded.userId;
          socket.user = {
            id: adminId, // Use adminId primarily
            type: 'admin',
            name: decoded.name || 'Admin',
            email: decoded.email
          };
          console.log(`👤 [Auth Middleware] Admin authenticated: ${adminId}`);
          return next();
        }

        // 3. Handle Customers / Widget Users (PRESERVE EXISTING LOGIC)
        // Allow customers/widget users to connect even if token structure is different
        if (decoded.id || decoded.customerId) {
          socket.user = {
            id: decoded.id || decoded.customerId,
            type: 'customer',
            name: decoded.name,
            email: decoded.email
          };
          console.log(`👤 [Auth Middleware] Customer/Widget user authenticated: ${socket.user.id}`);
          return next();
        }

        // If token is valid but doesn't match any known type, allow as customer (widget fallback)
        console.log(`⚠️ [Auth Middleware] Token valid but unknown type for ${socket.id} - allowing as customer`);
        socket.user = { type: 'customer' };
        return next();

      } catch (error) {
        // Authentication failed - allow connection anyway (widget/customer might not have valid JWT)
        console.log(`⚠️ [Auth Middleware] Token verification failed for ${socket.id}: ${error.message} - allowing connection (widget/customer)`);
        socket.user = { type: 'customer' }; // Default to customer for widget connections
        return next(); // Always allow connection - don't block widget users
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      console.log(`👤 User type: ${socket.user?.type || 'unknown'}`);
      console.log(`🔑 Auth Token Present?`, !!socket.handshake.auth?.token);

      // ===== PERSONAL ROOM JOINING =====
      // Join personal rooms based on authenticated user type
      if (socket.user?.type === 'agent' && socket.user?.id) {
        const agentRoomName = `agent_${socket.user.id}`;
        socket.join(agentRoomName);
        console.log(`👤 Agent ${socket.user.id} joined personal room: ${agentRoomName}`);
        
        // Store agent ID on socket for backward compatibility
        socket.agentId = socket.user.id;
      } else if (socket.user?.type === 'admin' && socket.user?.id) {
        const adminRoomName = `admin_${socket.user.id}`;
        socket.join(adminRoomName);
        console.log(`👤 Admin ${socket.user.id} joined personal room: ${adminRoomName}`);
      } else {
        console.log(`ℹ️ [Connection] No personal room join needed for ${socket.user?.type || 'customer'} user`);
      }

      // Admin/Agent joins a chat room for listening
      socket.on('join_chat_room', (data) => {
        const { chatId } = data;
        if (chatId) {
          socket.join(`chat_${chatId}`);
          console.log(`👤 Admin/Agent joined chat room: chat_${chatId}`);
        }
      });

      // Customer joins chat
      socket.on('join_chat', async (data) => {
        try {
          await this.handleJoinChat(socket, data);
        } catch (error) {
          console.error('Error in join_chat:', error);
          socket.emit('error', { message: 'Failed to join chat' });
        }
      });

      // Customer sends message (for LiveChat - legacy)
      socket.on('send_message', async (data) => {
        try {
          // Route to ticket handler if conversationId is present, otherwise live chat
          if (data.conversationId) {
            await this.handleTicketMessage(socket, data);
          } else {
            await this.handleSendMessage(socket, data);
          }
        } catch (error) {
          console.error('Error in send_message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Agent assigns chat to themselves
      socket.on('assign_chat', async (data, callback) => {
        try {
          await this.handleAssignChat(socket, data);
          // Send acknowledgment if callback provided
          if (callback && typeof callback === 'function') {
            callback({ success: true, chatId: data.chatId });
          }
        } catch (error) {
          console.error('Error in assign_chat:', error);
          socket.emit('error', { message: 'Failed to assign chat' });
          if (callback && typeof callback === 'function') {
            callback({ success: false, error: error.message });
          }
        }
      });

      // Agent sends message
      socket.on('agent_message', async (data) => {
        try {
          await this.handleAgentMessage(socket, data);
        } catch (error) {
          console.error('Error in agent_message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Join ticket conversation room
      socket.on('join_room', (data) => {
        const { conversationId } = data;
        if (conversationId) {
          const roomName = `ticket_${conversationId}`;
          socket.join(roomName);
          console.log(`🔌 Socket ${socket.id} joined room: ${roomName}`);
        }
      });

      // Legacy support - keep for backward compatibility
      socket.on('join_ticket_room', (data) => {
        const { ticketId } = data;
        if (ticketId) {
          const roomName = `ticket_${ticketId}`;
          socket.join(roomName);
          console.log(`🔌 Socket ${socket.id} joined room: ${roomName}`);
        }
      });

      // Leave ticket conversation room
      socket.on('leave_ticket_room', (data) => {
        const { ticketId } = data;
        if (ticketId) {
          socket.leave(`ticket_${ticketId}`);
          console.log(`👤 Client left ticket room: ticket_${ticketId}`);
        }
      });

      // Note: send_message handler is above - routes based on conversationId presence

      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });
  }

  async handleJoinChat(socket, data) {
    const { name, email, department, message, metadata } = data;

    console.log(`💬 New chat request from ${name} (${email}) - Department: ${department}`);

    // Check for existing waiting/active chat for this customer
    let chat = await prisma.liveChat.findFirst({
      where: {
        customerEmail: email.toLowerCase(),
        status: { in: ['waiting', 'active'] },
      },
      include: { messages: true },
    });

    if (chat) {
      console.log(`♻️ Reusing existing chat ${chat.id} for ${email}`);
      
      // Add new message if provided
      if (message) {
        await prisma.liveChatMessage.create({
          data: {
            chatId: chat.id,
            senderId: email,
            senderType: 'customer',
            senderName: name,
            content: message,
            timestamp: new Date(),
            read: false,
          },
        });

        await prisma.liveChat.update({
          where: { id: chat.id },
          data: { lastMessageAt: new Date() },
        });
      }

      socket.join(`chat_${chat.id}`);
      socket.emit('chat_joined', {
        chatId: chat.id,
        status: chat.status,
        message: 'Reconnected to your existing chat',
      });
      return;
    }

    // Create new chat
    chat = await prisma.liveChat.create({
      data: {
        customerName: name,
        customerEmail: email.toLowerCase(),
        department,
        status: 'waiting',
        metadata: metadata || {},
        messages: {
          create: {
            senderId: email,
            senderType: 'customer',
            senderName: name,
            content: message,
            timestamp: new Date(),
            read: false,
          },
        },
      },
      include: { messages: true },
    });

    socket.join(`chat_${chat.id}`);

    socket.emit('chat_joined', {
      chatId: chat.id,
      status: 'waiting',
      message: 'Connected! An agent will be with you shortly.',
    });

    // Notify all agents about new chat
    if (this.io) {
      this.io.emit('new_chat', {
        chatId: chat.id,
        customerName: chat.customerName,
        customerEmail: chat.customerEmail,
        department: chat.department,
        message: message,
        startedAt: chat.startedAt,
        status: chat.status,
      });
    }

    console.log(`✅ Chat created: ${chat.id}`);
  }

  async handleSendMessage(socket, data) {
    const { chatId, message, senderName, attachments } = data;

    const chat = await prisma.liveChat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      socket.emit('error', { message: 'Chat not found' });
      return;
    }

    // Create message
    const newMessage = await prisma.liveChatMessage.create({
      data: {
        chatId,
        senderId: chat.customerEmail,
        senderType: 'customer',
        senderName: senderName || chat.customerName,
        content: message,
        timestamp: new Date(),
        read: false,
        attachments: attachments || null,
      },
    });

    // Update chat last message time
    await prisma.liveChat.update({
      where: { id: chatId },
      data: { lastMessageAt: new Date() },
    });

    // Broadcast to everyone in the chat room (including admins/agents)
    if (this.io) {
      const messageData = {
        id: newMessage.id,
        chatId,
        senderId: chat.customerEmail,
        senderType: 'customer',
        senderName: chat.customerName,
        content: message,
        timestamp: newMessage.timestamp,
        attachments: attachments || [],
      };
      
      console.log(`📤 Broadcasting customer message to chat_${chatId}:`, messageData);
      // Emit to the specific chat room
      this.io.to(`chat_${chatId}`).emit('new_message', messageData);
      // Also emit to all connected clients (for admin panel updates)
      this.io.emit('new_message', messageData);
    }

    // Notify assigned agent if any
    if (chat.assignedAgentId && this.io) {
      this.io.emit('chat_message_notification', {
        chatId,
        customerName: chat.customerName,
        message,
        attachments: attachments || [],
      });
    }

    console.log(`📨 Message sent in chat ${chatId}`);
  }

  async handleAssignChat(socket, data) {
    const { chatId, agentId, agentName } = data;

    const chat = await prisma.liveChat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      socket.emit('error', { message: 'Chat not found' });
      return;
    }

    // Update chat
    await prisma.liveChat.update({
      where: { id: chatId },
      data: {
        assignedAgentId: agentId,
        assignedAgentName: agentName,
        status: 'active',
      },
    });

    // Join agent to chat room
    socket.join(`chat_${chatId}`);

    // Notify customer
    if (this.io) {
      this.io.to(`chat_${chatId}`).emit('agent_joined', {
        chatId,
        agentName,
        message: `${agentName} has joined the chat`,
      });
    }

    // Notify all agents (update chat list)
    if (this.io) {
      this.io.emit('chat_assigned', {
        chatId,
        agentId,
        agentName,
        status: 'active',
      });
    }

    console.log(`👤 Agent ${agentName} assigned to chat ${chatId}`);
  }

  async handleAgentMessage(socket, data) {
    const { chatId, agentId, agentName, message, attachments } = data;

    const chat = await prisma.liveChat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      socket.emit('error', { message: 'Chat not found' });
      return;
    }

    // Create message
    const newMessage = await prisma.liveChatMessage.create({
      data: {
        chatId,
        senderId: agentId,
        senderType: 'agent',
        senderName: agentName,
        content: message,
        timestamp: new Date(),
        read: false,
        attachments: attachments || null,
      },
    });

    // Update chat
    await prisma.liveChat.update({
      where: { id: chatId },
      data: { lastMessageAt: new Date() },
    });

    // Broadcast to everyone in the chat room (including customer)
    if (this.io) {
      const messageData = {
        id: newMessage.id,
        chatId,
        senderId: agentId,
        senderType: 'agent',
        senderName: agentName,
        content: message,
        timestamp: newMessage.timestamp,
        attachments: attachments || [],
      };
      
      console.log(`📤 Broadcasting agent message to chat_${chatId}:`, messageData);
      this.io.to(`chat_${chatId}`).emit('new_message', messageData);
      
      // Also emit to all connected clients (for admin panel updates)
      this.io.emit('new_message', messageData);
    }

    console.log(`📨 Agent message sent in chat ${chatId}`);
  }

  /**
   * Handle ticket message (for Conversation/Message model)
   * Uses "Socket ID Exclusion" pattern to prevent duplicates
   */
  async handleTicketMessage(socket, payload) {
    const { conversationId, content, senderId, senderType, senderName, socketId, attachments, replyToId, metadata, replyTo } = payload;

    // Validation
    // Allow empty content if there's metadata (file attachment)
    if (!conversationId || !senderType || (!content && !metadata)) {
      socket.emit('error', { message: 'conversationId, senderType, and either content or metadata are required' });
      return;
    }

    // Verify conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { ticketNumber: conversationId },
      include: {
        customer: {
          select: { name: true, email: true }
        },
        assignee: {
          select: { name: true, email: true }
        }
      }
    });

    if (!conversation) {
      socket.emit('error', { message: 'Conversation not found' });
      return;
    }

    // Check if conversation is closed or resolved
    if (conversation.status === 'closed' || conversation.status === 'resolved') {
      socket.emit('error', { message: 'Cannot send messages to closed or resolved tickets' });
      return;
    }

    // Resolve senderId if needed (for customer messages, senderId might be email)
    let actualSenderId = senderId;
    if (senderType === 'customer' && senderId && !senderId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // senderId is likely an email, find the actual customer
      const customer = await prisma.customer.findFirst({
        where: { email: senderId.toLowerCase() }
      });
      if (customer) {
        actualSenderId = customer.id;
      }
    }

    // READ-ONLY ENFORCEMENT: For agent messages, check if agent is the ticket owner
    // NOTE: Customer messages are always allowed (they can always reply to their own tickets)
    if (senderType === 'agent' && actualSenderId) {
      // Check if ticket is assigned to this agent
      const isOwner = conversation.assigneeId === actualSenderId;
      const isUnassigned = conversation.assigneeId === null;
      
      // If ticket is assigned to someone else, deny access (read-only mode)
      if (!isOwner && !isUnassigned) {
        socket.emit('error', { 
          message: 'You do not have permission to send messages to this ticket. This ticket is assigned to another agent and is in read-only mode.' 
        });
        return;
      }
    }

    // Resolve senderName if not provided
    let actualSenderName = senderName;
    if (!actualSenderName) {
      if (senderType === 'customer') {
        actualSenderName = conversation.customer?.name || conversation.customerName || 'Customer';
      } else if (senderType === 'admin') {
        // Try to fetch admin name
        try {
          const admin = await prisma.admin.findFirst({
            where: { id: actualSenderId },
            select: { name: true }
          });
          if (admin) {
            actualSenderName = admin.name;
          }
        } catch (err) {
          console.error('Error fetching admin name:', err);
        }
        actualSenderName = actualSenderName || 'Admin';
      } else if (senderType === 'agent') {
        // Try to fetch agent name from database
        try {
          const agent = await prisma.agent.findFirst({
            where: { id: actualSenderId },
            select: { name: true }
          });
          if (agent) {
            actualSenderName = agent.name;
          }
        } catch (err) {
          console.error('Error fetching agent name:', err);
        }
        // Fallback to assignee name or 'Agent'
        actualSenderName = actualSenderName || conversation.assignee?.name || 'Agent';
      }
    }

    // Build metadata for replyTo and attachment
    let messageMetadata = metadata || null;
    if (replyToId) {
      messageMetadata = messageMetadata ? { ...messageMetadata, replyTo: replyToId } : { replyTo: replyToId };
    }

    // Save message to database (Source of Truth)
    const newMessage = await prisma.message.create({
      data: {
        conversationId: conversationId,
        senderId: actualSenderId,
        senderType: senderType,
        content: content.trim(),
        type: 'text',
        metadata: messageMetadata
      }
    });

    // Handle attachments - save to database
    let savedAttachments = [];
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(process.cwd(), 'uploads', 'tickets', conversationId);
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      for (const attachment of attachments) {
        if (attachment.base64 && attachment.filename && attachment.mimeType) {
          try {
            const base64Data = attachment.base64.split(',')[1] || attachment.base64;
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Preserve original filename but sanitize for filesystem
            const originalFilename = attachment.filename || 'file';
            // Sanitize filename for filesystem (remove path separators, keep extension)
            const sanitizedFilename = originalFilename.replace(/[\/\\?%*:|"<>]/g, '_');
            // Create unique filename with timestamp prefix
            const timestamp = Date.now();
            const fileExtension = path.extname(sanitizedFilename);
            const baseName = path.basename(sanitizedFilename, fileExtension);
            const uniqueFilename = `${timestamp}_${baseName}${fileExtension}`;
            const filePath = path.join(uploadsDir, uniqueFilename);
            
            fs.writeFileSync(filePath, buffer);
            // URL should use encoded filename for special characters
            const encodedFilename = encodeURIComponent(uniqueFilename);
            const fileUrl = `/api/uploads/tickets/${conversationId}/${encodedFilename}`;

            const savedAttachment = await prisma.attachment.create({
              data: {
                messageId: newMessage.id,
                url: fileUrl,
                filename: originalFilename, // Store original filename in DB
                mimeType: attachment.mimeType,
                size: buffer.length
              }
            });

            savedAttachments.push({
              id: savedAttachment.id,
              url: savedAttachment.url,
              filename: savedAttachment.filename,
              mimeType: savedAttachment.mimeType,
              size: savedAttachment.size
            });
          } catch (err) {
            console.error('Error saving attachment:', err);
            // Continue even if attachment fails
          }
        } else if (attachment.url) {
          // If URL is already provided (from previous upload)
          const savedAttachment = await prisma.attachment.create({
            data: {
              messageId: newMessage.id,
              url: attachment.url,
              filename: attachment.filename || 'file',
              mimeType: attachment.mimeType || 'application/octet-stream',
              size: attachment.size || 0
            }
          });

          savedAttachments.push({
            id: savedAttachment.id,
            url: savedAttachment.url,
            filename: savedAttachment.filename,
            mimeType: savedAttachment.mimeType,
            size: savedAttachment.size
          });
        }
      }
    }

    // Use replyTo from payload if provided (for immediate broadcast), otherwise fetch from DB
    let replyToMessage = null;
    if (replyTo) {
      // Use the replyTo object from the payload (already has all needed info)
      replyToMessage = replyTo;
    } else if (replyToId) {
      // Fallback: Fetch from DB if replyTo object not provided
      try {
        const replyMsg = await prisma.message.findUnique({
          where: { id: replyToId },
          select: {
            id: true,
            content: true,
            senderType: true,
            senderId: true
          }
        });
        
        if (replyMsg) {
          // Get sender name for reply
          let replySenderName = 'Unknown';
          if (replyMsg.senderType === 'customer') {
            const customer = await prisma.customer.findUnique({
              where: { id: replyMsg.senderId },
              select: { name: true }
            });
            replySenderName = customer?.name || 'Customer';
          } else if (replyMsg.senderType === 'admin') {
            const admin = await prisma.admin.findFirst({
              where: { id: replyMsg.senderId },
              select: { name: true }
            });
            replySenderName = admin?.name || 'Admin';
          } else if (replyMsg.senderType === 'agent') {
            const agent = await prisma.agent.findFirst({
              where: { id: replyMsg.senderId },
              select: { name: true }
            });
            replySenderName = agent?.name || 'Agent';
          }
          
          replyToMessage = {
            id: replyMsg.id,
            content: replyMsg.content,
            senderType: replyMsg.senderType,
            senderName: replySenderName
          };
        }
      } catch (err) {
        console.error('Error fetching replyTo message:', err);
      }
    }

    // Update conversation's lastMessageAt
    await prisma.conversation.update({
      where: { ticketNumber: conversationId },
      data: { lastMessageAt: new Date() }
    });

    // Build final message object for broadcast
    const finalMessage = {
      id: newMessage.id,
      conversationId: conversationId,
      senderId: actualSenderId,
      senderType: senderType,
      senderName: actualSenderName,
      content: newMessage.content,
      createdAt: newMessage.createdAt.toISOString(),
      attachments: savedAttachments,
      metadata: newMessage.metadata || undefined,
      replyTo: replyToMessage,
      socketId: socketId // Include socketId so sender can ignore it
    };

    // Broadcast to room EXCEPT sender (Socket ID Exclusion pattern)
    const roomName = `ticket_${conversationId}`;
    if (this.io) {
      console.log(`📤 Broadcasting message to room ${roomName} (excluding sender ${socketId})`);
      // Use socket.to() to exclude the sender
      socket.to(roomName).emit('receive_message', finalMessage);
      
      // Also emit to sender with a confirmation (optional, for reliability)
      socket.emit('message_sent', {
        id: newMessage.id,
        conversationId: conversationId,
        success: true
      });
      
      // ===== PERSONAL AGENT NOTIFICATION =====
      // If message is from customer and ticket is assigned to an agent, emit to agent's personal room
      if (senderType === 'customer') {
        try {
          const conversation = await prisma.conversation.findUnique({
            where: { ticketNumber: conversationId },
            select: { assigneeId: true, subject: true, customerName: true }
          });
          
          if (conversation?.assigneeId) {
            const agentNotificationData = {
              type: 'new_message',
              conversationId: conversationId,
              ticketId: conversationId,
              ticketNumber: conversationId,
              senderType: senderType,
              sender: senderType,
              senderName: actualSenderName,
              customerName: conversation.customerName || actualSenderName,
              message: finalMessage.content,
              content: finalMessage.content,
              timestamp: finalMessage.createdAt
            };
            
            const agentRoomName = `agent_${conversation.assigneeId}`;
            console.log(`🔔 Emitting agent:notification to ${agentRoomName} for new customer message`);
            this.io.to(agentRoomName).emit('agent:notification', agentNotificationData);
          }
        } catch (err) {
          console.error('❌ Error emitting agent notification:', err);
          // Don't fail the message if notification fails
        }
      }
    }

    console.log(`✅ Message saved and broadcast: ${newMessage.id} in conversation ${conversationId}`);
  }

  /**
   * Emit ticket assignment event to assigned agent
   * @param {Object} data - Assignment data
   * @param {string} data.ticketId - Ticket number
   * @param {string} data.assigneeId - Agent ID
   * @param {string} data.assigneeName - Agent name
   * @param {string} data.assignedBy - Admin/agent who assigned
   * @param {Object} data.ticket - Ticket object (optional, for full data)
   */
  emitTicketAssignment(data) {
    if (!this.io) {
      console.warn('⚠️ Socket.IO not initialized, cannot emit ticket:assigned event');
      return;
    }

    const { ticketId, assigneeId, assigneeName, assignedBy, ticket } = data;
    
    console.log(`📢 Emitting ticket:assigned event for ticket ${ticketId} to agent ${assigneeId}`);
    
    const payload = {
      ticketId,
      assigneeId,
      assignee: {
        id: assigneeId,
        name: assigneeName
      },
      assignedBy: assignedBy ? {
        name: assignedBy
      } : null,
      assignerName: assignedBy,
      ticket: ticket || {
        ticketNumber: ticketId,
        id: ticketId
      },
      timestamp: new Date().toISOString()
    };
    
    // ===== TARGET PERSONAL AGENT ROOM (matches message notification pattern) =====
    // Emit directly to the specific agent's personal room instead of broadcasting
    const agentRoom = `agent_${assigneeId}`;
    console.log(`🔔 Emitting ticket:assigned to personal room: ${agentRoom}`);
    this.io.to(agentRoom).emit('ticket:assigned', payload);
    
    console.log(`✅ ticket:assigned event emitted to agent ${assigneeId}'s personal room`);
  }
}

// Singleton instance
let chatServiceInstance = null;

function initialize(io) {
  if (!chatServiceInstance) {
    chatServiceInstance = new ChatService();
  }
  chatServiceInstance.initialize(io);
  return chatServiceInstance;
}

module.exports = { initialize, ChatService };

