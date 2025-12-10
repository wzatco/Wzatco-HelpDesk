// Widget API - Fetch single ticket with messages
import { PrismaClient } from '@prisma/client';

// Prisma singleton pattern
let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      const { email } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Ticket ID is required'
        });
      }

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      // Find customer by email
      const customer = await prisma.customer.findFirst({
        where: { email: email.toLowerCase() }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // Fetch ticket (conversation) with messages
      const ticket = await prisma.conversation.findFirst({
        where: {
          id: id,
          customerId: customer.id // Ensure customer owns this ticket
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc'
            },
            include: {
              attachments: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          department: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      // Format response
      const formattedTicket = {
        id: ticket.id,
        subject: ticket.subject || `Ticket #${ticket.id}`,
        status: ticket.status || 'open',
        priority: ticket.priority || 'medium',
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        lastMessageAt: ticket.lastMessageAt,
        customerId: ticket.customerId,
        assignee: ticket.assignee ? {
          id: ticket.assignee.id,
          name: ticket.assignee.name,
          email: ticket.assignee.email
        } : null,
        department: ticket.department ? {
          id: ticket.department.id,
          name: ticket.department.name
        } : null,
        messages: await Promise.all(ticket.messages.map(async (msg) => {
          // Fetch replyTo message if exists
          let replyTo = null;
          if (msg.metadata && msg.metadata.replyTo) {
            try {
              const replyMsg = await prisma.message.findUnique({
                where: { id: msg.metadata.replyTo },
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
                
                replyTo = {
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
          
          return {
            id: msg.id,
            content: msg.content,
            senderType: msg.senderType,
            senderId: msg.senderId,
            type: msg.type,
            createdAt: msg.createdAt,
            metadata: msg.metadata || undefined,
            replyTo: replyTo
          };
        }))
      };

      res.status(200).json({
        success: true,
        ticket: formattedTicket
      });

    } catch (error) {
      console.error('Error fetching ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching ticket'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

