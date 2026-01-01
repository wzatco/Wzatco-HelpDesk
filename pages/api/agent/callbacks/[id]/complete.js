// Agent API - Mark Callback as Completed
import prisma from '@/lib/prisma';
import { getCurrentAgentId } from '../../../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const agentId = await getCurrentAgentId(req);

    if (!agentId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Callback ID is required' });
    }

    // Verify callback exists and is assigned to this agent
    const callback = await prisma.scheduledCallback.findUnique({
      where: { id }
    });

    if (!callback) {
      return res.status(404).json({ success: false, message: 'Callback not found' });
    }

    if (callback.agentId !== agentId) {
      return res.status(403).json({ success: false, message: 'You do not have permission to update this callback' });
    }

    // Update callback status to completed
    const updatedCallback = await prisma.scheduledCallback.update({
      where: { id },
      data: { status: 'completed' }
    });

    res.status(200).json({
      success: true,
      callback: updatedCallback,
      message: 'Callback marked as completed'
    });

  } catch (error) {
    console.error('Error completing callback:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing callback',
      error: error.message
    });
  }
}

