import { PrismaClient } from '@prisma/client';
import { updateTATMetrics } from '../../../../../lib/utils/tat';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { conversationId, agentId, worklogId } = req.body;

    if (!conversationId || !agentId) {
      return res.status(400).json({
        success: false,
        message: 'conversationId and agentId are required'
      });
    }

    // Find active worklog
    let worklog;
    
    if (worklogId) {
      worklog = await prisma.worklog.findUnique({
        where: { id: worklogId }
      });
    } else {
      worklog = await prisma.worklog.findFirst({
        where: {
          conversationId,
          agentId,
          endedAt: null
        },
        orderBy: {
          startedAt: 'desc'
        }
      });
    }

    if (!worklog) {
      return res.status(404).json({
        success: false,
        message: 'No active worklog found'
      });
    }

    if (worklog.endedAt) {
      return res.status(200).json({
        success: true,
        worklog,
        message: 'Worklog already stopped'
      });
    }

    // Calculate duration
    const endTime = new Date();
    const durationSeconds = Math.floor((endTime - new Date(worklog.startedAt)) / 1000);

    // Update worklog
    const updatedWorklog = await prisma.worklog.update({
      where: { id: worklog.id },
      data: {
        endedAt: endTime,
        durationSeconds
      },
      include: {
        Agent: {
          select: {
            id: true,
            name: true,
            email: true,
            slug: true
          }
        },
        Conversation: {
          select: {
            id: true,
            subject: true,
            status: true,
            priority: true
          }
        }
      }
    });

    // Update TAT metrics for the conversation
    await updateTATMetrics(prisma, conversationId);

    return res.status(200).json({
      success: true,
      worklog: {
        ...updatedWorklog,
        durationFormatted: formatDuration(updatedWorklog.durationSeconds)
      }
    });
  } catch (error) {
    console.error('Error stopping auto worklog:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to stop worklog',
      error: error.message
    });
  }
}

function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

