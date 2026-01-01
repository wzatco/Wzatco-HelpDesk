import { Server } from 'socket.io'
import prisma from '../../lib/prisma'
import jwt from 'jsonwebtoken'

// Get JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET is not set in environment variables. Using fallback secret (NOT SECURE FOR PRODUCTION).');
}

// In-memory store for agent presence tracking
// Maps agentId -> { socketIds: Set, presenceStatus, lastSeenAt }
const agentPresenceMap = new Map()

// In-memory store for customer activity tracking
// Maps conversationId -> Set of customer socketIds (to track if customer is active on a ticket)
const customerActivityMap = new Map()

// In-memory store for agent activity tracking
// Maps conversationId -> Set of agent socketIds (to track if agent is active on a ticket)
const agentActivityMap = new Map()

export default async function handler(req, res) {
  if (!res.socket.server.io) {
  const io = new Server(res.socket.server, {
    path: '/socket.io',
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
    upgradeTimeout: 10000,
    allowUpgrades: true
  })
    res.socket.server.io = io

    // Helper function to update agent presence in DB and broadcast
    async function updateAgentPresence(agentId, presenceStatus, lastSeenAt = null) {
      try {
        const updateData = {
          presenceStatus,
          updatedAt: new Date()
        }
        if (lastSeenAt) {
          updateData.lastSeenAt = lastSeenAt
        }
        
        await prisma.agent.update({
          where: { id: agentId },
          data: updateData
        })

        // Broadcast to all connected clients
        io.emit('agent:presence:update', {
          agentId,
          presenceStatus,
          lastSeenAt: lastSeenAt || new Date(),
          updatedAt: new Date()
        })
      } catch (err) {
        console.error('Failed to update agent presence in DB', err)
      }
    }

    io.on('connection', async (socket) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '')
      
      let user = { id: `anon_${socket.id}`, role: 'customer', name: 'Anonymous', agentId: null }
      
      // Try to authenticate with JWT token
      if (token) {
        try {
          const secret = JWT_SECRET || 'your-secret-key-change-in-production';
          const decoded = jwt.verify(token, secret)
          
          // Check if it's an agent token
          if (decoded.type === 'agent' && decoded.id) {
            // Find agent in database
            const agent = await prisma.agent.findUnique({
              where: { id: decoded.id },
              include: {
                department: { select: { id: true, name: true } },
                role: { select: { id: true, title: true } },
                account: { select: { id: true, name: true, email: true, avatarUrl: true } }
              }
            })
            
            if (agent && agent.isActive) {
              user = {
                id: agent.account?.id || agent.id,
                role: 'agent',
                name: agent.name,
                email: agent.email || agent.account?.email,
                agentId: agent.id,
                departmentId: agent.departmentId,
                roleId: agent.roleId,
                avatarUrl: agent.account?.avatarUrl
              }
              
              // Update agent presence to online
              await updateAgentPresence(agent.id, 'online', new Date())
            }
          } else if (decoded.type === 'admin' || decoded.adminId) {
            // Admin user - fetch from database
            const adminId = decoded.adminId || decoded.userId;
            
            if (adminId) {
              try {
                // Try to find admin by adminId first
                let admin = await prisma.admin.findUnique({
                  where: { id: adminId },
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true
                  }
                });
                
                // If not found by adminId, try to find by userId (if adminId was actually a userId)
                if (!admin && decoded.userId) {
                  const user = await prisma.user.findUnique({
                    where: { id: decoded.userId },
                    select: { email: true }
                  });
                  
                  if (user?.email) {
                    admin = await prisma.admin.findUnique({
                      where: { email: user.email },
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true
                      }
                    });
                  }
                }
                
                if (admin) {
                  user = {
                    id: admin.id,
                    role: 'admin',
                    name: admin.name || 'Admin',
                    email: admin.email,
                    avatarUrl: admin.avatarUrl,
                    agentId: null
                  };
                } else {
                  // Fallback: use token data if admin not found in DB
                  user = {
                    id: adminId,
                    role: 'admin',
                    name: decoded.name || 'Admin',
                    agentId: null
                  };
                }
              } catch (dbError) {
                console.error('❌ [Socket] Error fetching admin from DB:', dbError);
                // Fallback: use token data
                user = {
                  id: adminId,
                  role: 'admin',
                  name: decoded.name || 'Admin',
                  agentId: null
                };
              }
            }
          }
        } catch (error) {
          console.error('Socket auth error:', error)
          // Fall back to anonymous user
        }
      }
      
      socket.data.user = user
      socket.emit('auth:success', { user })
      
      // Join personal room based on user role
      if (user.role === 'agent' && user.agentId) {
        const agentRoom = `agent_${user.agentId}`;
        socket.join(agentRoom);
        console.log(`👤 [Socket] Agent joined personal room: ${agentRoom}`);
      } else if (user.role === 'admin' && user.id) {
        const adminRoom = `admin_${user.id}`;
        socket.join(adminRoom);
        console.log(`👤 [Socket] Admin joined personal room: ${adminRoom}`);
      }

      socket.on('join:conversation', async (payload, ack) => {
        try {
          const { conversationId } = payload || {}
          const conv = await prisma.conversation.findUnique({ where: { ticketNumber: conversationId } })
          if (!conv) {
            ack && ack({ success: false, code: 'not_found', message: 'Conversation not found' })
            return
          }
          socket.join(`conversation:${conversationId}`)
          
          // Track customer activity if this is a customer socket
          if (socket.data.user.role === 'customer') {
            if (!customerActivityMap.has(conversationId)) {
              customerActivityMap.set(conversationId, new Set())
            }
            customerActivityMap.get(conversationId).add(socket.id)
            socket.data.activeConversation = conversationId
          }
          
          // Track agent activity if this is an agent/admin socket
          if (socket.data.user.role === 'admin' || socket.data.user.role === 'agent') {
            if (!agentActivityMap.has(conversationId)) {
              agentActivityMap.set(conversationId, new Set())
            }
            agentActivityMap.get(conversationId).add(socket.id)
            socket.data.activeConversation = conversationId
          }
          
          const messages = await prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' }, take: 100 })
          ack && ack({ success: true, conversation: conv, messages })
        } catch (err) {
          console.error('join:conversation error', err)
          ack && ack({ success: false, code: 'server_error' })
        }
      })

      socket.on('ticket:leave', async (payload, ack) => {
        try {
          const { ticketId } = payload || {}
          const viewingTicket = ticketId || socket.data.viewingTicket

          if (viewingTicket) {
            socket.leave(`ticket:${viewingTicket}`)
            socket.data.viewingTicket = null
          }

          ack && ack({ success: true })
        } catch (err) {
          console.error('ticket:leave error', err)
          ack && ack({ success: false, code: 'server_error' })
        }
      })

      // Internal Chat Room Handlers
      socket.on('join_internal_chat', (chatId) => {
        if (!chatId) {
          console.warn('⚠️ [Socket] join_internal_chat called without chatId');
          return;
        }
        const room = `internal:chat:${chatId}`;
        socket.join(room);
        console.log(`✅ [Socket] ${socket.id} (${socket.data.user?.role || 'unknown'}) joined ${room}`);
      });

      socket.on('leave_internal_chat', (chatId) => {
        if (!chatId) {
          console.warn('⚠️ [Socket] leave_internal_chat called without chatId');
          return;
        }
        const room = `internal:chat:${chatId}`;
        socket.leave(room);
        console.log(`✅ [Socket] ${socket.id} left ${room}`);
      });

      // Generic room join/leave handlers (for backward compatibility)
      socket.on('join_room', (payload) => {
        const room = typeof payload === 'string' ? payload : payload?.room;
        if (!room) {
          console.warn('⚠️ [Socket] join_room called without room');
          return;
        }
        socket.join(room);
        console.log(`✅ [Socket] ${socket.id} joined room: ${room}`);
      });

      socket.on('leave_room', (payload) => {
        const room = typeof payload === 'string' ? payload : payload?.room;
        if (!room) {
          console.warn('⚠️ [Socket] leave_room called without room');
          return;
        }
        socket.leave(room);
        console.log(`✅ [Socket] ${socket.id} left room: ${room}`);
      });

      socket.on('message:send', async (payload, ack) => {
        try {
          const { conversationId, clientMessageId, content, type = 'text', metadata } = payload || {}
          if (!conversationId || !content) {
            ack && ack({ success: false, code: 'invalid_payload' })
            return
          }
          const senderType = socket.data.user.role === 'admin' ? 'agent' : 'customer'
          const msg = await prisma.message.create({ data: { conversationId, senderId: socket.data.user.id, senderType, content, type, metadata: metadata || {} } })
          
          // Trigger webhook for message creation
          try {
            const { triggerWebhook } = await import('../../lib/utils/webhooks')
            const conversation = await prisma.conversation.findUnique({
              where: { ticketNumber: conversationId },
              include: { customer: true, assignee: true }
            })
            await triggerWebhook('message.created', {
              message: {
                id: msg.id,
                content: msg.content,
                senderId: msg.senderId,
                senderType: msg.senderType,
                type: msg.type,
                createdAt: msg.createdAt
              },
              ticket: {
                ticketNumber: conversation?.ticketNumber || conversationId,
                subject: conversation?.subject,
                status: conversation?.status,
                priority: conversation?.priority
              },
              customer: conversation?.customer ? {
                id: conversation.customer.id,
                name: conversation.customer.name,
                email: conversation.customer.email
              } : null
            })
          } catch (webhookError) {
            console.error('Error triggering message.created webhook:', webhookError)
            // Don't fail message creation if webhook fails
          }
          
          // Update TAT metrics if this is the first agent response
          if (senderType === 'agent') {
            try {
              // Check if this is the first response before updating TAT
              const conversation = await prisma.conversation.findUnique({
                where: { ticketNumber: conversationId },
                include: { customer: true }
              })

              const isFirstResponse = !conversation?.firstResponseAt && conversation?.firstResponseTimeSeconds === null

              const { updateTATMetrics } = await import('../../lib/utils/tat')
              await updateTATMetrics(prisma, conversationId)

              // Send first response email to customer if this is the first response
              if (isFirstResponse && conversation?.customer?.email) {
                try {
                  const { notifyFirstResponseCustomer } = await import('../../lib/utils/notifications')
                  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
                  const ticketLink = `${baseUrl}/ticket/${conversationId}`
                  
                  await notifyFirstResponseCustomer(prisma, {
                    ticketId: conversationId,
                    ticketSubject: conversation.subject || 'No subject',
                    customerEmail: conversation.customer.email,
                    customerName: conversation.customer.name || 'Customer',
                    agentName: socket.data.user.name || 'Support Agent',
                    messageContent: content,
                    ticketLink
                  })
                } catch (firstResponseError) {
                  console.error('Error sending first response email to customer:', firstResponseError)
                  // Don't fail the message send if email fails
                }
              }

              // Check if customer is active, if not send email notification
              const customerSockets = customerActivityMap.get(conversationId)
              const isCustomerActive = customerSockets && customerSockets.size > 0
              
              if (!isCustomerActive && conversation?.customer?.email) {
                // Customer is not active, send email notification
                try {
                  const { notifyCustomerMessage } = await import('../../lib/utils/notifications')
                  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
                  const ticketLink = `${baseUrl}/ticket/${conversationId}`
                  
                  await notifyCustomerMessage(prisma, {
                    ticketId: conversationId,
                    ticketSubject: conversation.subject || 'No subject',
                    customerEmail: conversation.customer.email,
                    customerName: conversation.customer.name || 'Customer',
                    messageContent: content,
                    senderName: socket.data.user.name || 'Support Agent',
                    ticketLink
                  })
                } catch (emailError) {
                  console.error('Error sending customer email notification:', emailError)
                  // Don't fail the message send if email fails
                }
              }
            } catch (tatError) {
              console.error('Error updating TAT metrics:', tatError)
            }
          } else if (senderType === 'customer') {
            // Customer sent a message - check if assigned agent is active
            try {
              const conversation = await prisma.conversation.findUnique({
                where: { ticketNumber: conversationId },
                include: { 
                  customer: true,
                  assignee: true
                }
              })
              
              if (conversation && conversation.assignee && conversation.assignee.email) {
                const agentSockets = agentActivityMap.get(conversationId)
                const isAgentActive = agentSockets && agentSockets.size > 0
                
                if (!isAgentActive) {
                  // Agent is not active, send email notification
                  try {
                    const { notifyCustomerMessageAgent } = await import('../../lib/utils/notifications')
                    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
                    const ticketLink = `${baseUrl}/admin/tickets/${conversationId}`
                    
                    await notifyCustomerMessageAgent(prisma, {
                      ticketId: conversationId,
                      ticketSubject: conversation.subject || 'No subject',
                      agentEmail: conversation.assignee.email,
                      agentName: conversation.assignee.name || 'Agent',
                      customerName: conversation.customer?.name || 'Customer',
                      customerEmail: conversation.customer?.email,
                      messageContent: content,
                      ticketLink
                    })
                  } catch (emailError) {
                    console.error('Error sending customer message email to agent:', emailError)
                    // Don't fail the message send if email fails
                  }
                }
              }
            } catch (error) {
              console.error('Error checking agent activity for customer message:', error)
              // Don't fail the message send if check fails
            }
          }
          
          const out = { id: msg.id, conversationId: msg.conversationId, sender: { id: msg.senderId, type: senderType, name: socket.data.user.name }, content: msg.content, type: msg.type, metadata: msg.metadata, createdAt: msg.createdAt }
          io.to(`conversation:${conversationId}`).emit('message:new', out)
          ack && ack({ success: true, clientMessageId, message: out })
        } catch (err) {
          console.error('message:send error', err)
          ack && ack({ success: false, code: 'server_error' })
        }
      })

      socket.on('typing:start', ({ conversationId }) => {
        socket.to(`conversation:${conversationId}`).emit('typing:update', { conversationId, user: socket.data.user, typing: true })
      })

      socket.on('typing:stop', ({ conversationId }) => {
        socket.to(`conversation:${conversationId}`).emit('typing:update', { conversationId, user: socket.data.user, typing: false })
      })

      // Agent presence management
      socket.on('presence:update', async (payload, ack) => {
        try {
          const { agentId, presenceStatus } = payload || {}
          if (!agentId || !presenceStatus) {
            ack && ack({ success: false, code: 'invalid_payload', message: 'agentId and presenceStatus are required' })
            return
          }

          const validStatuses = ['online', 'away', 'busy', 'offline', 'on_leave', 'in_meeting', 'dnd']
          if (!validStatuses.includes(presenceStatus)) {
            ack && ack({ success: false, code: 'invalid_status', message: 'Invalid presence status' })
            return
          }

          // Verify agent exists
          const agent = await prisma.agent.findUnique({ where: { id: agentId } })
          if (!agent) {
            ack && ack({ success: false, code: 'not_found', message: 'Agent not found' })
            return
          }

          // Track socket connection for this agent
          if (!agentPresenceMap.has(agentId)) {
            agentPresenceMap.set(agentId, { socketIds: new Set(), presenceStatus: 'offline', lastSeenAt: null })
          }
          const presence = agentPresenceMap.get(agentId)
          presence.socketIds.add(socket.id)
          presence.presenceStatus = presenceStatus
          presence.lastSeenAt = new Date()

          // Update in database
          const lastSeenAt = presenceStatus === 'online' ? new Date() : null
          await updateAgentPresence(agentId, presenceStatus, lastSeenAt)

          // Store agentId in socket data for cleanup on disconnect
          socket.data.agentId = agentId

          ack && ack({ success: true, presenceStatus, lastSeenAt: presence.lastSeenAt })
        } catch (err) {
          console.error('presence:update error', err)
          ack && ack({ success: false, code: 'server_error' })
        }
      })

      socket.on('presence:get', async (payload, ack) => {
        try {
          const { agentIds } = payload || {}
          
          if (!agentIds || !Array.isArray(agentIds)) {
            ack && ack({ success: false, code: 'invalid_payload', message: 'agentIds array is required' })
            return
          }

          const agents = await prisma.agent.findMany({
            where: { id: { in: agentIds } },
            select: {
              id: true,
              slug: true,
              name: true,
              presenceStatus: true,
              lastSeenAt: true
            }
          })

          // Merge with real-time presence data
          const presenceData = agents.map(agent => {
            const realtimePresence = agentPresenceMap.get(agent.id)
            return {
              agentId: agent.id,
              agentSlug: agent.slug,
              name: agent.name,
              presenceStatus: realtimePresence?.presenceStatus || agent.presenceStatus,
              lastSeenAt: realtimePresence?.lastSeenAt || agent.lastSeenAt,
              isOnline: realtimePresence?.socketIds?.size > 0 || false
            }
          })

          ack && ack({ success: true, presence: presenceData })
        } catch (err) {
          console.error('presence:get error', err)
          ack && ack({ success: false, code: 'server_error' })
        }
      })

      socket.on('disconnect', async () => {
        // Cleanup agent presence if this socket was tracking an agent
        const agentId = socket.data.agentId
        if (agentId && agentPresenceMap.has(agentId)) {
          const presence = agentPresenceMap.get(agentId)
          presence.socketIds.delete(socket.id)
          
          // If no more sockets for this agent, mark as offline
          if (presence.socketIds.size === 0) {
            await updateAgentPresence(agentId, 'offline')
            agentPresenceMap.delete(agentId)
          }
        }

      // Cleanup customer activity tracking
      const activeConversation = socket.data.activeConversation
      if (activeConversation) {
        // Cleanup customer activity
        if (customerActivityMap.has(activeConversation)) {
          const customerSockets = customerActivityMap.get(activeConversation)
          customerSockets.delete(socket.id)
          if (customerSockets.size === 0) {
            customerActivityMap.delete(activeConversation)
          }
        }
        
        // Cleanup agent activity
        if (agentActivityMap.has(activeConversation)) {
          const agentSockets = agentActivityMap.get(activeConversation)
          agentSockets.delete(socket.id)
          if (agentSockets.size === 0) {
            agentActivityMap.delete(activeConversation)
          }
        }
      }
    })
  })

    console.log('Socket.IO server initialized')
  }
  res.end()
}
