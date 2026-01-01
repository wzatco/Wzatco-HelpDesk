import { getCurrentUserId } from '../../../../lib/auth';
import { checkPermissionOrFail } from '../../../../lib/permissions';
import { setAgentOnLeave, setAgentActive } from '../../../../lib/services/leave-service';

/**
 * Admin API Endpoint: Agent Leave Status Management
 * POST: Admin can set any agent's leave status
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check admin permissions
    await checkPermissionOrFail(userId, 'agents', 'edit');

    const { agentId, status, from, to } = req.body;

    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    if (!status || !['ON_LEAVE', 'ACTIVE'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be "ON_LEAVE" or "ACTIVE"',
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
            error: '"from" date must be before "to" date',
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
      message:
        status === 'ON_LEAVE'
          ? `Agent set on leave. ${result.unassignedCount || 0} tickets unassigned.`
          : 'Agent set to active.',
      status: result.agent.status,
      leaveFrom: result.agent.leaveFrom,
      leaveTo: result.agent.leaveTo,
      ...(result.unassignedCount !== undefined && {
        unassignedCount: result.unassignedCount,
      }),
    });
  } catch (error) {
    console.error('Error updating agent leave status:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
}

