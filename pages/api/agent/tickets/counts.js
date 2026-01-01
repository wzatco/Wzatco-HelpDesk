import prisma from '../../../../lib/prisma';
import { getCurrentAgentId } from '../../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const agentId = await getCurrentAgentId(req);
    
    if (!agentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get agent info to check departments
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { departmentId: true }
    });

    // Get ticket counts for this agent
    const [assigned, open, pending, resolved, claimable] = await Promise.all([
      prisma.conversation.count({
        where: {
          assigneeId: agentId
        }
      }),
      prisma.conversation.count({
        where: {
          assigneeId: agentId,
          status: 'open'
        }
      }),
      prisma.conversation.count({
        where: {
          assigneeId: agentId,
          status: 'pending'
        }
      }),
      prisma.conversation.count({
        where: {
          assigneeId: agentId,
          status: 'resolved'
        }
      }),
      prisma.conversation.count({
        where: {
          assigneeId: null,
          isClaimable: true,
          status: { notIn: ['closed', 'resolved'] },
          ...(agent?.departmentId ? { departmentId: agent.departmentId } : {})
        }
      })
    ]);

    // Calculate "Need Reply" count - tickets where last message is from customer
    // Get tickets assigned to agent or unassigned in agent's department
    const whereClause = {
      OR: [
        { 
          assigneeId: agentId,
          status: { notIn: ['closed', 'resolved'] } // Only active assigned tickets
        },
        {
          assigneeId: null,
          status: { notIn: ['closed', 'resolved'] }, // Only active unassigned
          ...(agent?.departmentId ? { departmentId: agent.departmentId } : {})
        }
      ]
    };

    const ticketsWithMessages = await prisma.conversation.findMany({
      where: whereClause,
      select: {
        ticketNumber: true,
        status: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { senderType: true }
        }
      }
    });

    const needReply = ticketsWithMessages.filter(ticket => {
      // Exclude resolved and closed tickets from need reply count
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        return false;
      }
      // If no messages, it's a new ticket (needs reply)
      if (!ticket.messages || ticket.messages.length === 0) {
        return true;
      }
      // If last message is from customer, needs reply
      const lastMessage = ticket.messages[0];
      return lastMessage && lastMessage.senderType === 'customer';
    }).length;

    return res.status(200).json({
      success: true,
      assigned,
      open,
      pending,
      resolved,
      needReply,
      claimable
    });
  } catch (error) {
    console.error('Error fetching ticket counts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

