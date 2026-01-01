import prisma from '@/lib/prisma';
import { updateTATMetrics } from '../../../../lib/utils/tat';


export default async function handler(req, res) {
    if (req.method === 'GET') {
    try {
      const { conversationId, ticketNumber, agentId, startDate, endDate } = req.query;

      const where = {};
      
      // Support both conversationId (legacy) and ticketNumber query params
      const ticketId = ticketNumber || conversationId;
      if (ticketId) {
        where.ticketNumber = ticketId;
      }
      
      if (agentId) {
        where.agentId = agentId;
      }
      
      if (startDate || endDate) {
        where.startedAt = {};
        if (startDate) {
          where.startedAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.startedAt.lte = new Date(endDate);
        }
      }

      const worklogs = await prisma.worklog.findMany({
        where,
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              email: true,
              slug: true
            }
          },
          ticket: {
            select: {
              ticketNumber: true,
              subject: true,
              status: true,
              priority: true
            }
          }
        },
        orderBy: {
          startedAt: 'desc'
        }
      });

      // Calculate duration for worklogs that don't have it
      const worklogsWithDuration = worklogs.map(worklog => {
        let duration = worklog.durationSeconds;
        
        if (!duration && worklog.endedAt) {
          duration = Math.floor((new Date(worklog.endedAt) - new Date(worklog.startedAt)) / 1000);
        } else if (!duration && !worklog.endedAt) {
          // Active worklog - calculate current duration
          duration = Math.floor((new Date() - new Date(worklog.startedAt)) / 1000);
        }

        // Map new relation names to legacy names for backward compatibility
        return {
          ...worklog,
          Agent: worklog.agent, // Legacy compatibility
          Conversation: worklog.ticket, // Legacy compatibility
          durationSeconds: duration,
          durationFormatted: formatDuration(duration)
        };
      });

      return res.status(200).json({
        success: true,
        worklogs: worklogsWithDuration,
        total: worklogsWithDuration.length
      });
    } catch (error) {
      console.error('Error fetching worklogs:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch worklogs',
        error: error.message
      });
    }
  }

  if (req.method === 'POST') {
    try {
      // Support both conversationId (legacy) and ticketNumber
      const { conversationId, ticketNumber, agentId, startedAt, endedAt, stopReason, isSystemAuto = false } = req.body;
      const ticketId = ticketNumber || conversationId;

      if (!ticketId || !agentId) {
        return res.status(400).json({
          success: false,
          message: 'ticketNumber (or conversationId) and agentId are required'
        });
      }

      // Verify conversation exists
      const conversation = await prisma.conversation.findUnique({
        where: { ticketNumber: ticketId }
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      // Verify agent exists
      const agent = await prisma.agent.findUnique({
        where: { id: agentId }
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
      }

      const startTime = startedAt ? new Date(startedAt) : new Date();
      const endTime = endedAt ? new Date(endedAt) : null;

      let durationSeconds = 0;
      if (endTime) {
        durationSeconds = Math.floor((endTime - startTime) / 1000);
      }

      const worklog = await prisma.worklog.create({
        data: {
          ticketNumber: ticketId,
          agentId,
          startedAt: startTime,
          endedAt: endTime,
          durationSeconds,
          stopReason: stopReason || null,
          isSystemAuto
        },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              email: true,
              slug: true
            }
          },
          ticket: {
            select: {
              ticketNumber: true,
              subject: true,
              status: true,
              priority: true
            }
          }
        }
      });

      // Update TAT metrics for the conversation
      await updateTATMetrics(prisma, ticketId);

      return res.status(201).json({
        success: true,
        worklog: {
          ...worklog,
          Agent: worklog.agent, // Legacy compatibility
          Conversation: worklog.ticket, // Legacy compatibility
          durationFormatted: worklog.durationSeconds ? formatDuration(worklog.durationSeconds) : 'Active'
        }
      });
    } catch (error) {
      console.error('Error creating worklog:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create worklog',
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

