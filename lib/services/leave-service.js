import prisma, { ensurePrismaConnected } from '../prisma';

/**
 * Leave Management Service
 * Handles agent leave status and ticket unassignment
 */

/**
 * Set agent on leave and unassign their active tickets
 * @param {string} agentId - Agent ID
 * @param {Object} leaveDateRange - { from: Date, to: Date }
 * @returns {Promise<Object>} - { success: boolean, unassignedCount: number, error?: string }
 */
export async function setAgentOnLeave(agentId, leaveDateRange = {}) {
  try {
    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, name: true }
    });

    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update agent status
      const updatedAgent = await tx.agent.update({
        where: { id: agentId },
        data: {
          status: 'ON_LEAVE',
          leaveFrom: leaveDateRange.from || null,
          leaveTo: leaveDateRange.to || null,
        },
      });

      // 1a. Create LeaveHistory record
      await tx.leaveHistory.create({
        data: {
          agentId: agentId,
          startDate: leaveDateRange.from || new Date(),
          endDate: leaveDateRange.to || null,
          status: 'ON_LEAVE',
        },
      });

      // 2. Find all active tickets assigned to this agent
      const activeTickets = await tx.conversation.findMany({
        where: {
          assigneeId: agentId,
          status: {
            notIn: ['resolved', 'closed']
          }
        },
        select: {
          ticketNumber: true,
          assigneeId: true,
        }
      });

      // 3. Unassign tickets in batch
      let unassignedCount = 0;
      const activityLogs = [];

      for (const ticket of activeTickets) {
        // Update ticket
        await tx.conversation.update({
          where: { ticketNumber: ticket.ticketNumber },
          data: {
            previousOwnerId: ticket.assigneeId,
            assigneeId: null,
            isClaimable: true,
            unassignedReason: 'leave',
          },
        });

        // Create activity log
        activityLogs.push({
          conversationId: ticket.ticketNumber,
          activityType: 'unassigned',
          oldValue: agent.name,
          newValue: null,
          performedBy: 'system',
          performedByName: 'System',
          reason: 'Agent marked on leave',
        });

        unassignedCount++;
      }

      // 4. Bulk create activity logs
      if (activityLogs.length > 0) {
        await tx.ticketActivity.createMany({
          data: activityLogs,
        });
      }

      return { updatedAgent, unassignedCount };
    });

    console.log(`[Leave Service] Agent ${agentId} set on leave. Unassigned ${result.unassignedCount} tickets.`);

    return {
      success: true,
      unassignedCount: result.unassignedCount,
      agent: {
        id: result.updatedAgent.id,
        status: result.updatedAgent.status,
        leaveFrom: result.updatedAgent.leaveFrom,
        leaveTo: result.updatedAgent.leaveTo,
      }
    };
  } catch (error) {
    console.error('[Leave Service] Error setting agent on leave:', error);
    return {
      success: false,
      error: error.message || 'Failed to set agent on leave'
    };
  }
}

/**
 * Set agent back to active status
 * @param {string} agentId - Agent ID
 * @returns {Promise<Object>} - { success: boolean, error?: string }
 */
export async function setAgentActive(agentId) {
  try {
    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, name: true }
    });

    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update agent status (clear leave dates)
      const updatedAgent = await tx.agent.update({
        where: { id: agentId },
        data: {
          status: 'ACTIVE',
          leaveFrom: null,
          leaveTo: null,
        },
      });

      // 2. Update the open LeaveHistory record (if exists)
      const now = new Date();
      await tx.leaveHistory.updateMany({
        where: {
          agentId: agentId,
          status: 'ON_LEAVE',
          endDate: null,
        },
        data: {
          endDate: now,
          status: 'RETURNED',
        },
      });

      return { updatedAgent };
    });

    const updatedAgent = result.updatedAgent;

    console.log(`[Leave Service] Agent ${agentId} set to active.`);

    return {
      success: true,
      agent: {
        id: updatedAgent.id,
        status: updatedAgent.status,
        leaveFrom: updatedAgent.leaveFrom,
        leaveTo: updatedAgent.leaveTo,
      }
    };
  } catch (error) {
    console.error('[Leave Service] Error setting agent active:', error);
    return {
      success: false,
      error: error.message || 'Failed to set agent active'
    };
  }
}

/**
 * Get agent leave status
 * @param {string} agentId - Agent ID
 * @returns {Promise<Object>} - { status: string, leaveFrom?: Date, leaveTo?: Date }
 */
export async function getAgentLeaveStatus(agentId) {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        status: true,
        leaveFrom: true,
        leaveTo: true,
      }
    });

    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }

    return {
      success: true,
      status: agent.status || 'ACTIVE',
      leaveFrom: agent.leaveFrom,
      leaveTo: agent.leaveTo,
    };
  } catch (error) {
    console.error('[Leave Service] Error getting agent leave status:', error);
    return {
      success: false,
      error: error.message || 'Failed to get agent leave status'
    };
  }
}

