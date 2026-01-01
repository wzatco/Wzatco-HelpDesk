import prisma, { ensurePrismaConnected } from '@/lib/prisma';
import { getTicketSettings } from '../../../../lib/settings';
import { notifyStatusChange } from '@/lib/utils/notifications';


/**
 * Auto-close inactive tickets based on settings
 * This should be called periodically (e.g., via cron job or scheduled task)
 */
export default async function handler(req, res) {
  await ensurePrismaConnected();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Get ticket settings
    const ticketSettings = await getTicketSettings();

    // Check if auto-close is enabled
    if (!ticketSettings.autoCloseEnabled) {
      return res.status(200).json({
        success: true,
        message: 'Auto-close is disabled',
        closedCount: 0
      });
    }

    const autoCloseHours = ticketSettings.autoCloseHours;
    const closingMessage = ticketSettings.closingMessage;

    // Calculate the cutoff time (X hours ago)
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - autoCloseHours);

    // Find tickets that are open/pending and haven't been updated in X hours
    const inactiveTickets = await prisma.conversation.findMany({
      where: {
        status: { in: ['open', 'pending'] },
        lastMessageAt: {
          lt: cutoffTime
        }
      },
      include: {
        customer: {
          select: {
            email: true,
            name: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    let closedCount = 0;

    for (const ticket of inactiveTickets) {
      try {
        // Update ticket status to closed
        await prisma.conversation.update({
          where: { ticketNumber: ticket.ticketNumber },
          data: {
            status: 'closed',
            updatedAt: new Date()
          }
        });

        // Create activity log
        await prisma.ticketActivity.create({
          data: {
            conversationId: ticket.ticketNumber,
            activityType: 'status_changed',
            oldValue: ticket.status,
            newValue: 'closed',
            performedBy: 'system',
            performedByName: 'Auto-Close System',
            metadata: JSON.stringify({
              reason: 'inactivity',
              hoursInactive: autoCloseHours,
              closingMessage: closingMessage
            })
          }
        });

        // Add closing message as a system message
        await prisma.message.create({
          data: {
            conversationId: ticket.ticketNumber,
            senderId: 'system',
            senderType: 'system',
            content: closingMessage,
            type: 'text'
          }
        });

        // Send notification
        try {
          await notifyStatusChange(prisma, {
            ticketId: ticket.ticketNumber,
            ticketSubject: ticket.subject || ticket.ticketNumber,
            oldStatus: ticket.status,
            newStatus: 'closed',
            changedBy: 'Auto-Close System',
            userId: ticket.assigneeId || null
          });
        } catch (notifError) {
          console.error(`Error sending notification for auto-closed ticket ${ticket.ticketNumber}:`, notifError);
        }

        closedCount++;
      } catch (error) {
        console.error(`Error auto-closing ticket ${ticket.ticketNumber}:`, error);
        // Continue with other tickets even if one fails
      }
    }

    res.status(200).json({
      success: true,
      message: `Auto-closed ${closedCount} inactive ticket(s)`,
      closedCount,
      totalChecked: inactiveTickets.length
    });

  } catch (error) {
    console.error('Error in auto-close process:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}

