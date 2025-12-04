import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// In-memory store for agent presence tracking
// Maps agentId -> { socketIds: Set, presenceStatus, lastSeenAt }
const agentPresenceMap = new Map()

// In-memory store for ticket view tracking
// Maps ticketId -> Set of { userId, userName, userAvatar, socketId }
const ticketViewersMap = new Map()

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

    io.on('connection', (socket) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization
      // Simple dev auth: token containing 'admin' => admin user; otherwise anonymous customer
      let user = { id: `anon_${socket.id}`, role: 'customer', name: 'Anonymous', agentId: null }
      if (token && String(token).toLowerCase().includes('admin')) {
        user = { id: 'u_admin', role: 'admin', name: 'Admin Demo', agentId: null }
      }
      
      // Extract agentId from token if available (format: "admin-{agentId}" or similar)
      // For now, we'll handle agent identification via presence:update event
      socket.data.user = user

      socket.emit('auth:success', { user })

      socket.on('join:conversation', async (payload, ack) => {
        try {
          const { conversationId } = payload || {}
          const conv = await prisma.conversation.findUnique({ where: { id: conversationId } })
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

      // Track ticket views for presence avatars
      socket.on('ticket:view', async (payload, ack) => {
        try {
          const { ticketId, userId, userName, userAvatar } = payload || {}
          if (!ticketId) {
            ack && ack({ success: false, code: 'invalid_payload', message: 'ticketId is required' })
            return
          }

          // Initialize ticket viewers set if not exists
          if (!ticketViewersMap.has(ticketId)) {
            ticketViewersMap.set(ticketId, new Map())
          }
          const viewers = ticketViewersMap.get(ticketId)

          // Add viewer
          viewers.set(socket.id, {
            userId: userId || socket.data.user.id,
            userName: userName || socket.data.user.name || 'Unknown',
            userAvatar: userAvatar || null,
            socketId: socket.id,
            joinedAt: new Date()
          })

          // Store ticketId in socket data for cleanup
          socket.data.viewingTicket = ticketId

          // Broadcast to others viewing this ticket
          socket.to(`ticket:${ticketId}`).emit('ticket:viewer:joined', {
            ticketId,
            viewer: {
              userId: userId || socket.data.user.id,
              userName: userName || socket.data.user.name || 'Unknown',
              userAvatar: userAvatar || null
            }
          })

          // Join ticket room
          socket.join(`ticket:${ticketId}`)

          // Send current viewers to the new viewer
          const currentViewers = Array.from(viewers.values()).map(v => ({
            userId: v.userId,
            userName: v.userName,
            userAvatar: v.userAvatar
          }))

          ack && ack({ success: true, viewers: currentViewers })
        } catch (err) {
          console.error('ticket:view error', err)
          ack && ack({ success: false, code: 'server_error' })
        }
      })

      socket.on('ticket:leave', async (payload, ack) => {
        try {
          const { ticketId } = payload || {}
          const viewingTicket = ticketId || socket.data.viewingTicket

          if (viewingTicket && ticketViewersMap.has(viewingTicket)) {
            const viewers = ticketViewersMap.get(viewingTicket)
            const viewer = viewers.get(socket.id)

            if (viewer) {
              // Remove viewer
              viewers.delete(socket.id)

              // If no more viewers, clean up
              if (viewers.size === 0) {
                ticketViewersMap.delete(viewingTicket)
              } else {
                // Broadcast to others
                socket.to(`ticket:${viewingTicket}`).emit('ticket:viewer:left', {
                  ticketId: viewingTicket,
                  userId: viewer.userId
                })
              }
            }

            socket.leave(`ticket:${viewingTicket}`)
            socket.data.viewingTicket = null
          }

          ack && ack({ success: true })
        } catch (err) {
          console.error('ticket:leave error', err)
          ack && ack({ success: false, code: 'server_error' })
        }
      })

      socket.on('message:send', async (payload, ack) => {
        try {
          const { conversationId, clientMessageId, content, type = 'text', metadata } = payload || {}
          if (!conversationId || !content) {
            ack && ack({ success: false, code: 'invalid_payload' })
            return
          }
          const senderType = socket.data.user.role === 'admin' ? 'agent' : 'customer'
          const msg = await prisma.message.create({ data: { conversationId, senderId: socket.data.user.id, senderType, content, type, metadata: metadata || {} } })
          
          // Update TAT metrics if this is the first agent response
          if (senderType === 'agent') {
            try {
              // Check if this is the first response before updating TAT
              const conversation = await prisma.conversation.findUnique({
                where: { id: conversationId },
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
                where: { id: conversationId },
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

        // Cleanup ticket view tracking
        const viewingTicket = socket.data.viewingTicket
        if (viewingTicket && ticketViewersMap.has(viewingTicket)) {
          const viewers = ticketViewersMap.get(viewingTicket)
          const viewer = viewers.get(socket.id)

          if (viewer) {
            viewers.delete(socket.id)

            // Broadcast to others
            socket.to(`ticket:${viewingTicket}`).emit('ticket:viewer:left', {
              ticketId: viewingTicket,
              userId: viewer.userId
            })

            // Clean up if no more viewers
            if (viewers.size === 0) {
              ticketViewersMap.delete(viewingTicket)
            }
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
