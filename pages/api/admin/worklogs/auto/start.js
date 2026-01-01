import prisma from '@/lib/prisma';
import { updateTATMetrics } from '../../../../../lib/utils/tat';


export default async function handler(req, res) {
    if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { conversationId, agentId } = req.body;

    if (!conversationId || !agentId) {
      return res.status(400).json({
        success: false,
        message: 'conversationId and agentId are required'
      });
    }

    // Check if there's an active worklog for this agent and conversation
    const activeWorklog = await prisma.worklog.findFirst({
      where: {
        conversationId,
        agentId,
        endedAt: null
      },
      orderBy: {
        startedAt: 'desc'
      }
    });

    if (activeWorklog) {
      return res.status(200).json({
        success: true,
        worklog: activeWorklog,
        message: 'Worklog already active'
      });
    }

    // Verify conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { ticketNumber: conversationId }
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

    // Create new worklog
    const worklog = await prisma.worklog.create({
      data: {
        conversationId,
        agentId,
        startedAt: new Date(),
        source: 'auto'
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

      return res.status(201).json({
        success: true,
        worklog: {
          ...worklog,
          durationFormatted: 'Active'
        }
      });
  } catch (error) {
    console.error('Error starting auto worklog:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to start worklog',
      error: error.message
    });
  }
}

