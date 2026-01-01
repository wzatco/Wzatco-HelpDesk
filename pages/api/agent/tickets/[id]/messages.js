import prisma from '../../../../../lib/prisma';
import { getCurrentAgentId } from '../../../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  const { id } = req.query;
  const agentId = await getCurrentAgentId(req);

  if (!agentId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    try {
      const { content, replyTo, metadata } = req.body;

      // Allow empty content if there's an attachment
      if ((!content || !content.trim()) && !metadata) {
        return res.status(400).json({ error: 'Message content or attachment is required' });
      }

      // Verify ticket exists and agent has access
      const ticket = await prisma.conversation.findUnique({
        where: { ticketNumber: id },
        include: {
          assignee: { select: { id: true, departmentId: true } },
          department: { select: { id: true } }
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Check access: agent must be assigned OR ticket must be unassigned in their department
      const currentAgent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { departmentId: true }
      });

      const hasAccess = 
        ticket.assigneeId === agentId ||
        (ticket.assigneeId === null && currentAgent?.departmentId && currentAgent.departmentId === ticket.departmentId);

      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have access to this ticket' });
      }

      // Create message with metadata (attachment info and/or replyTo)
      const messageMetadata = {};
      if (replyTo) {
        messageMetadata.replyTo = replyTo;
      }
      if (metadata) {
        messageMetadata.type = metadata.type;
        messageMetadata.url = metadata.url;
        messageMetadata.fileName = metadata.fileName;
      }

      const message = await prisma.message.create({
        data: {
          conversationId: ticket.ticketNumber,
          content: content?.trim() || '',
          senderType: 'agent',
          senderId: agentId,
          metadata: Object.keys(messageMetadata).length > 0 ? messageMetadata : undefined
        }
      });

      // Update ticket's lastMessageAt and firstResponseAt if this is the first agent response
      const updateData = { lastMessageAt: new Date() };
      if (!ticket.firstResponseAt) {
        updateData.firstResponseAt = new Date();
      }

      await prisma.conversation.update({
        where: { ticketNumber: id },
        data: updateData
      });

      // Fetch agent info for senderName
      const agentInfo = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { name: true }
      });

      // Emit Socket.IO events
      const io = req.io || global.io;
      if (io) {
        io.emit('message:created', {
          conversationId: ticket.ticketNumber,
          ticketNumber: ticket.ticketNumber,
          message: {
            id: message.id,
            content: message.content,
            senderType: 'agent',
            senderId: agentId,
            senderName: agentInfo?.name || 'Agent',
            createdAt: message.createdAt,
            metadata: message.metadata || undefined,
            replyTo: message.metadata?.replyTo || null
          }
        });

        io.emit('ticket:updated', {
          ticketNumber: ticket.ticketNumber,
          updates: {
            lastMessageAt: updateData.lastMessageAt
          }
        });
      }

      // Transform message for response
      res.status(201).json({
        success: true,
        message: {
          id: message.id,
          content: message.content,
          senderType: 'agent',
          senderId: agentId,
          senderName: agentInfo?.name || 'Agent',
          createdAt: message.createdAt,
          metadata: message.metadata || undefined,
          replyTo: message.metadata?.replyTo || null
        }
      });

    } catch (error) {
      console.error('Error creating agent message:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

