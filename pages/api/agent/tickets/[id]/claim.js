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
      // Verify ticket exists
      const ticket = await prisma.conversation.findUnique({
        where: { ticketNumber: id },
        include: {
          department: { select: { id: true } }
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Check if ticket is already assigned
      if (ticket.assigneeId) {
        return res.status(400).json({ error: 'Ticket is already assigned' });
      }

      // Check if ticket is claimable (optional check - can be removed if all unassigned tickets should be claimable)
      // For now, we'll allow claiming any unassigned ticket, but log if it's not marked as claimable
      if (ticket.isClaimable === false) {
        console.log(`[Claim API] Warning: Ticket ${id} is being claimed but isClaimable is false`);
      }

      // Check if agent has access to this ticket (must be in same department)
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { departmentId: true, name: true }
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // If ticket has a department, agent must be in that department
      if (ticket.departmentId && agent.departmentId !== ticket.departmentId) {
        return res.status(403).json({ error: 'You can only claim tickets from your department' });
      }

      // Assign ticket to agent with auto-department routing
      const updateData = {
        assigneeId: agentId,
        isClaimable: false,        // Clear claimable flag when claimed
        unassignedReason: null,    // Clear unassigned reason
      };
      
      // Auto-update departmentId to match agent's department
      if (agent.departmentId) {
        updateData.departmentId = agent.departmentId;
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
            oldValue: null,
            newValue: agent.name,
            performedBy: 'agent',
            performedByName: agent.name
          }
        });
      } catch (activityError) {
        console.error('Error creating activity log:', activityError);
        // Don't fail the request if activity log fails
      }

      res.status(200).json({
        success: true,
        message: 'Ticket claimed successfully',
        ticket: {
          ticketNumber: updatedTicket.ticketNumber,
          assigneeId: updatedTicket.assigneeId
        }
      });

    } catch (error) {
      console.error('Error claiming ticket:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
