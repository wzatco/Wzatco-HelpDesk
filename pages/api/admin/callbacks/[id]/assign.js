// Admin API - Assign Callback to Agent
import { PrismaClient } from '@prisma/client';
import { getCurrentUserId } from '@/lib/auth';
import { createNotification } from '@/lib/utils/notifications';

// Prisma singleton pattern
let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { agentId } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Callback ID is required' });
    }

    if (!agentId) {
      return res.status(400).json({ success: false, message: 'Agent ID is required' });
    }

    // Verify callback exists
    const callback = await prisma.scheduledCallback.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!callback) {
      return res.status(404).json({ success: false, message: 'Callback not found' });
    }

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        email: true,
        userId: true
      }
    });

    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    // Update callback with agent assignment
    const updatedCallback = await prisma.scheduledCallback.update({
      where: { id },
      data: { agentId },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Format scheduled time for notification
    const scheduledDate = new Date(callback.scheduledTime);
    const formattedDate = scheduledDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });

    // Create notification for the assigned agent
    try {
      // Use agent.userId if available, otherwise use agent.id
      const notificationUserId = agent.userId || agent.id;
      
      await createNotification(prisma, {
        userId: notificationUserId,
        type: 'callback_assigned',
        title: 'New Callback Assigned',
        message: `You have been assigned a callback from ${callback.customerName} scheduled for ${formattedDate} at ${formattedTime}${callback.reason ? ` - ${callback.reason.substring(0, 50)}${callback.reason.length > 50 ? '...' : ''}` : ''}`,
        link: '/agent/callbacks',
        metadata: JSON.stringify({
          callbackId: callback.id,
          customerName: callback.customerName,
          customerEmail: callback.customerEmail,
          phoneNumber: callback.phoneNumber,
          reason: callback.reason,
          scheduledTime: callback.scheduledTime.toISOString()
        })
      });

      // Emit socket event for real-time notification
      try {
        const { initialize } = await import('@/lib/chat-service');
        const chatService = initialize();
        
        if (chatService && chatService.io) {
          const agentRoom = `agent_${agent.id}`;
          chatService.io.to(agentRoom).emit('callback:assigned', {
            callbackId: callback.id,
            customerName: callback.customerName,
            scheduledTime: callback.scheduledTime.toISOString(),
            reason: callback.reason
          });
          console.log(`🔔 Emitted callback:assigned to agent room: ${agentRoom}`);
        }
      } catch (socketError) {
        console.error('Error emitting socket event:', socketError);
        // Don't fail the request if socket fails
      }
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the request if notification fails
    }

    res.status(200).json({
      success: true,
      callback: updatedCallback,
      message: 'Callback assigned successfully'
    });

  } catch (error) {
    console.error('Error assigning callback:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning callback',
      error: error.message
    });
  }
}
