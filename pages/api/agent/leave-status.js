import { getCurrentAgentId } from '@/lib/utils/agent-auth';
import { 
  setAgentOnLeave, 
  setAgentActive, 
  getAgentLeaveStatus 
} from '@/lib/services/leave-service';

/**
 * API Endpoint: Agent Leave Status Management
 * GET: Get current leave status
 * POST: Toggle leave status (ON_LEAVE or ACTIVE)
 */
export default async function handler(req, res) {
  const agentId = await getCurrentAgentId(req);

  if (!agentId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const result = await getAgentLeaveStatus(agentId);

      if (!result.success) {
        return res.status(404).json({ error: result.error });
      }

      return res.status(200).json({
        status: result.status,
        leaveFrom: result.leaveFrom,
        leaveTo: result.leaveTo,
      });
    } catch (error) {
      console.error('Error fetching leave status:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { status, from, to } = req.body;

      if (!status || !['ON_LEAVE', 'ACTIVE'].includes(status)) {
        return res.status(400).json({ 
          error: 'Invalid status. Must be "ON_LEAVE" or "ACTIVE"' 
        });
      }

      let result;

      if (status === 'ON_LEAVE') {
        // Validate date range if provided
        const leaveDateRange = {};
        if (from) {
          leaveDateRange.from = new Date(from);
          if (isNaN(leaveDateRange.from.getTime())) {
            return res.status(400).json({ error: 'Invalid "from" date' });
          }
        }
        if (to) {
          leaveDateRange.to = new Date(to);
          if (isNaN(leaveDateRange.to.getTime())) {
            return res.status(400).json({ error: 'Invalid "to" date' });
          }
        }

        // Validate date range logic
        if (leaveDateRange.from && leaveDateRange.to) {
          if (leaveDateRange.from > leaveDateRange.to) {
            return res.status(400).json({ 
              error: '"from" date must be before "to" date' 
            });
          }
        }

        result = await setAgentOnLeave(agentId, leaveDateRange);
      } else {
        // ACTIVE
        result = await setAgentActive(agentId);
      }

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.status(200).json({
        success: true,
        message: status === 'ON_LEAVE' 
          ? `Set on leave. ${result.unassignedCount || 0} tickets unassigned.`
          : 'Set to active.',
        status: result.agent.status,
        leaveFrom: result.agent.leaveFrom,
        leaveTo: result.agent.leaveTo,
        ...(result.unassignedCount !== undefined && { 
          unassignedCount: result.unassignedCount 
        }),
      });
    } catch (error) {
      console.error('Error updating leave status:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

