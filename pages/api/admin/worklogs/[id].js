import { PrismaClient } from '@prisma/client';
import { updateTATMetrics } from '../../../../lib/utils/tat';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const worklog = await prisma.worklog.findUnique({
        where: { id },
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

      if (!worklog) {
        return res.status(404).json({
          success: false,
          message: 'Worklog not found'
        });
      }

      let duration = worklog.durationSeconds;
      if (!duration && worklog.endedAt) {
        duration = Math.floor((new Date(worklog.endedAt) - new Date(worklog.startedAt)) / 1000);
      } else if (!duration && !worklog.endedAt) {
        duration = Math.floor((new Date() - new Date(worklog.startedAt)) / 1000);
      }

      return res.status(200).json({
        success: true,
        worklog: {
          ...worklog,
          durationSeconds: duration,
          durationFormatted: formatDuration(duration)
        }
      });
    } catch (error) {
      console.error('Error fetching worklog:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch worklog',
        error: error.message
      });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { endedAt, description, startedAt } = req.body;

      const worklog = await prisma.worklog.findUnique({
        where: { id }
      });

      if (!worklog) {
        return res.status(404).json({
          success: false,
          message: 'Worklog not found'
        });
      }

      const updateData = {};
      
      if (endedAt !== undefined) {
        updateData.endedAt = endedAt ? new Date(endedAt) : null;
      }
      
      if (description !== undefined) {
        updateData.description = description;
      }
      
      if (startedAt !== undefined) {
        updateData.startedAt = new Date(startedAt);
      }

      // Recalculate duration if end time is set
      if (updateData.endedAt !== undefined) {
        const startTime = updateData.startedAt ? new Date(updateData.startedAt) : new Date(worklog.startedAt);
        const endTime = updateData.endedAt || new Date();
        
        if (endTime >= startTime) {
          updateData.durationSeconds = Math.floor((endTime - startTime) / 1000);
        }
      }

      const updatedWorklog = await prisma.worklog.update({
        where: { id },
        data: updateData,
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
      await updateTATMetrics(prisma, updatedWorklog.conversationId);

      return res.status(200).json({
        success: true,
        worklog: {
          ...updatedWorklog,
          durationFormatted: updatedWorklog.durationSeconds 
            ? formatDuration(updatedWorklog.durationSeconds) 
            : (updatedWorklog.endedAt ? '0s' : 'Active')
        }
      });
    } catch (error) {
      console.error('Error updating worklog:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update worklog',
        error: error.message
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const worklog = await prisma.worklog.findUnique({
        where: { id }
      });

      if (!worklog) {
        return res.status(404).json({
          success: false,
          message: 'Worklog not found'
        });
      }

      const deletedWorklog = await prisma.worklog.delete({
        where: { id }
      });

      // Update TAT metrics for the conversation
      await updateTATMetrics(prisma, deletedWorklog.conversationId);

      return res.status(200).json({
        success: true,
        message: 'Worklog deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting worklog:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete worklog',
        error: error.message
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
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

