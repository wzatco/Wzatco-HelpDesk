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
      const { agentId: assignToAgentId, reason } = req.body;

      if (!assignToAgentId) {
        return res.status(400).json({ error: 'Agent ID is required' });
      }

      if (!reason || !reason.trim()) {
        return res.status(400).json({ error: 'Reason is required for assignment' });
      }

      // Verify ticket exists and current agent has access
      const ticket = await prisma.conversation.findUnique({
        where: { ticketNumber: id },
        include: {
          assignee: { select: { id: true, name: true } }
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Check if current agent has access (must be assigned to them)
      if (ticket.assigneeId !== agentId) {
        return res.status(403).json({ error: 'You can only assign tickets that are assigned to you' });
      }

      // Verify target agent exists (include departmentId for auto-routing)
      const targetAgent = await prisma.agent.findUnique({
        where: { id: assignToAgentId },
        select: { id: true, name: true, email: true, departmentId: true }
      });

      if (!targetAgent) {
        return res.status(404).json({ error: 'Target agent not found' });
      }

      // Get current agent info
      const currentAgent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { name: true }
      });

      // Update ticket assignment with auto-department routing
      const updateData = {
        assigneeId: assignToAgentId
      };
      
      // Auto-update departmentId to match target agent's department
      if (targetAgent.departmentId) {
        updateData.departmentId = targetAgent.departmentId;
      }

      const updatedTicket = await prisma.conversation.update({
        where: { ticketNumber: id },
        data: updateData
      });

      // Create activity log
      try {
        await prisma.ticketActivity.create({
          data: {
            conversationId: ticket.ticketNumber,
            activityType: 'assigned',
            oldValue: ticket.assignee?.name || 'Unassigned',
            newValue: targetAgent.name,
            reason: reason.trim(),
            performedBy: 'agent',
            performedByName: currentAgent?.name || 'Agent'
          }
        });
      } catch (activityError) {
        console.error('Error creating activity log:', activityError);
        // Don't fail the request if activity log fails
      }

      // Emit socket event to notify the newly assigned agent
      try {
        const { initialize } = await import('../../../../../lib/chat-service');
        const chatService = initialize();
        
        console.log('🎯 Agent transfer successful, emitting ticket:assigned event');
        chatService.emitTicketAssignment({
          ticketId: ticket.ticketNumber,
          assigneeId: targetAgent.id,
          assigneeName: targetAgent.name,
          assignedBy: currentAgent?.name || 'Agent',
          ticket: updatedTicket
        });
      } catch (socketError) {
        console.error('❌ Error emitting ticket:assigned socket event for agent transfer:', socketError);
        // Don't fail the request if socket emission fails
      }

      res.status(200).json({
        success: true,
        message: 'Ticket assigned successfully',
        ticket: {
          ticketNumber: updatedTicket.ticketNumber,
          assigneeId: updatedTicket.assigneeId
        }
      });

    } catch (error) {
      console.error('Error assigning ticket:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

