import prisma from '../../../../lib/prisma';
import { getCurrentAgentId } from '../../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  const agentId = await getCurrentAgentId(req);

  if (!agentId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    try {
      const { action, ticketIds, data } = req.body;

      if (!action || !ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
        return res.status(400).json({ error: 'Invalid request: action and ticketIds array required' });
      }

      // Verify agent has access to these tickets (must be assigned to them)
      const tickets = await prisma.conversation.findMany({
        where: {
          ticketNumber: { in: ticketIds },
          assigneeId: agentId
        }
      });

      if (tickets.length !== ticketIds.length) {
        return res.status(403).json({ 
          error: 'You can only perform bulk actions on tickets assigned to you',
          accessible: tickets.length,
          requested: ticketIds.length
        });
      }

      // Get agent info for activity logs
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { name: true }
      });

      let results = [];

      switch (action) {
        case 'status':
          if (!data.status) {
            return res.status(400).json({ error: 'Status is required' });
          }

          // Update all tickets
          await prisma.conversation.updateMany({
            where: { ticketNumber: { in: ticketIds } },
            data: { status: data.status }
          });

          // Create activity logs
          for (const ticket of tickets) {
            await prisma.ticketActivity.create({
              data: {
                conversationId: ticket.ticketNumber,
                activityType: 'status_changed',
                oldValue: ticket.status,
                newValue: data.status,
                reason: data.reason || 'Bulk status change',
                performedBy: 'agent',
                performedByName: agent?.name || 'Agent'
              }
            });
          }

          results = ticketIds.map(id => ({ ticketId: id, success: true }));
          break;

        case 'priority':
          if (!data.priority) {
            return res.status(400).json({ error: 'Priority is required' });
          }

          // Update all tickets
          await prisma.conversation.updateMany({
            where: { ticketNumber: { in: ticketIds } },
            data: { priority: data.priority }
          });

          // Create activity logs
          for (const ticket of tickets) {
            await prisma.ticketActivity.create({
              data: {
                conversationId: ticket.ticketNumber,
                activityType: 'priority_changed',
                oldValue: ticket.priority || 'not set',
                newValue: data.priority,
                reason: data.reason || 'Bulk priority change',
                performedBy: 'agent',
                performedByName: agent?.name || 'Agent'
              }
            });
          }

          results = ticketIds.map(id => ({ ticketId: id, success: true }));
          break;

        case 'assign':
          if (!data.agentId || !data.reason || !data.reason.trim()) {
            return res.status(400).json({ error: 'Agent ID and reason are required for assignment' });
          }

          // Verify target agent exists (include departmentId for auto-routing)
          const targetAgent = await prisma.agent.findUnique({
            where: { id: data.agentId },
            select: { id: true, name: true, departmentId: true }
          });

          if (!targetAgent) {
            return res.status(404).json({ error: 'Target agent not found' });
          }

          // Update all tickets with auto-department routing
          const updateData = {
            assigneeId: data.agentId
          };
          
          // Auto-update departmentId to match target agent's department
          if (targetAgent.departmentId) {
            updateData.departmentId = targetAgent.departmentId;
          }

          await prisma.conversation.updateMany({
            where: { ticketNumber: { in: ticketIds } },
            data: updateData
          });

          // Create activity logs and emit socket events
          const { initialize } = await import('../../../../lib/chat-service');
          const chatService = initialize();

          for (const ticket of tickets) {
            await prisma.ticketActivity.create({
              data: {
                conversationId: ticket.ticketNumber,
                activityType: 'assigned',
                oldValue: agent?.name || 'Current Agent',
                newValue: targetAgent.name,
                reason: data.reason.trim(),
                performedBy: 'agent',
                performedByName: agent?.name || 'Agent'
              }
            });

            // Emit socket event to notify the newly assigned agent
            try {
              chatService.emitTicketAssignment({
                ticketId: ticket.ticketNumber,
                assigneeId: targetAgent.id,
                assigneeName: targetAgent.name,
                assignedBy: agent?.name || 'Agent',
                ticket: ticket
              });
            } catch (socketError) {
              console.error('Error emitting ticket:assigned for bulk action:', socketError);
            }
          }

          results = ticketIds.map(id => ({ ticketId: id, success: true }));
          break;

        default:
          return res.status(400).json({ error: `Unknown action: ${action}` });
      }

      res.status(200).json({
        success: true,
        message: `Bulk ${action} completed successfully`,
        results
      });

    } catch (error) {
      console.error('Error performing bulk action:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
