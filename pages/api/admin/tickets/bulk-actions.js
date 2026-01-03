import prisma from '../../../../lib/prisma';
import { getCurrentUserId } from '../../../../lib/auth';
import { checkPermissionOrFail } from '../../../../lib/permissions';

export default async function handler(req, res) {
  const userId = getCurrentUserId(req);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check permission
  const hasAccess = await checkPermissionOrFail(userId, 'admin.tickets', res);
  if (!hasAccess) return;

  if (req.method === 'POST') {
    try {
      const { action, ticketIds, data } = req.body;

      if (!action || !ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
        return res.status(400).json({ error: 'Invalid request: action and ticketIds array required' });
      }

      // Get admin info for activity logs
      const admin = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true }
      });

      // Fetch tickets to verify they exist
      const tickets = await prisma.conversation.findMany({
        where: {
          ticketNumber: { in: ticketIds }
        },
        include: {
          assignee: {
            select: { id: true, name: true, email: true }
          },
          customer: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      if (tickets.length !== ticketIds.length) {
        return res.status(404).json({ 
          error: 'Some tickets were not found',
          found: tickets.length,
          requested: ticketIds.length
        });
      }

      let results = [];
      const { initialize } = await import('../../../../lib/chat-service');
      const chatService = initialize();

      switch (action) {
        case 'status':
          if (!data.status) {
            return res.status(400).json({ error: 'Status is required' });
          }

          // Update all tickets
          await prisma.conversation.updateMany({
            where: { ticketNumber: { in: ticketIds } },
            data: { status: data.status }
          });

          // Create activity logs
          for (const ticket of tickets) {
            await prisma.ticketActivity.create({
              data: {
                conversationId: ticket.ticketNumber,
                activityType: 'status_changed',
                oldValue: ticket.status,
                newValue: data.status,
                reason: data.reason || 'Bulk status change',
                performedBy: 'admin',
                performedByName: admin?.name || 'Admin'
              }
            });
          }

          results = ticketIds.map(id => ({ ticketId: id, success: true }));
          break;

        case 'priority':
          if (!data.priority) {
            return res.status(400).json({ error: 'Priority is required' });
          }

          // Update all tickets
          await prisma.conversation.updateMany({
            where: { ticketNumber: { in: ticketIds } },
            data: { priority: data.priority }
          });

          // Create activity logs
          for (const ticket of tickets) {
            await prisma.ticketActivity.create({
              data: {
                conversationId: ticket.ticketNumber,
                activityType: 'priority_changed',
                oldValue: ticket.priority || 'not set',
                newValue: data.priority,
                reason: data.reason || 'Bulk priority change',
                performedBy: 'admin',
                performedByName: admin?.name || 'Admin'
              }
            });
          }

          results = ticketIds.map(id => ({ ticketId: id, success: true }));
          break;

        case 'assign':
          if (!data.assigneeId || !data.reason || !data.reason.trim()) {
            return res.status(400).json({ error: 'Assignee ID and reason are required for assignment' });
          }

          // Determine assignee type and fetch assignee
          let assignee = null;
          if (data.assigneeType === 'admin') {
            assignee = await prisma.user.findUnique({
              where: { id: data.assigneeId },
              select: { id: true, name: true, email: true, type: true }
            });
          } else {
            assignee = await prisma.agent.findUnique({
              where: { id: data.assigneeId },
              select: { id: true, name: true, email: true, departmentId: true }
            });
          }

          if (!assignee) {
            return res.status(404).json({ error: 'Assignee not found' });
          }

          // Update all tickets
          const updateData = {
            assigneeId: data.assigneeId
          };
          
          // Auto-update departmentId if assigning to agent
          if (data.assigneeType === 'agent' && assignee.departmentId) {
            updateData.departmentId = assignee.departmentId;
          }

          await prisma.conversation.updateMany({
            where: { ticketNumber: { in: ticketIds } },
            data: updateData
          });

          // Create activity logs and send notifications
          const assignedTicketNumbers = [];
          for (const ticket of tickets) {
            await prisma.ticketActivity.create({
              data: {
                conversationId: ticket.ticketNumber,
                activityType: 'assigned',
                oldValue: ticket.assignee?.name || 'Unassigned',
                newValue: assignee.name,
                reason: data.reason.trim(),
                performedBy: 'admin',
                performedByName: admin?.name || 'Admin'
              }
            });

            assignedTicketNumbers.push(ticket.ticketNumber);

            // Emit socket event to notify the newly assigned user
            try {
              chatService.emitTicketAssignment({
                ticketId: ticket.ticketNumber,
                assigneeId: assignee.id,
                assigneeName: assignee.name,
                assignedBy: admin?.name || 'Admin',
                ticket: ticket
              });
            } catch (socketError) {
              console.error('Error emitting ticket:assigned for bulk action:', socketError);
            }
          }

          // Send notification to assignee with list of tickets
          try {
            const { notifyBulkAssignment } = await import('../../../../lib/utils/notifications');
            await notifyBulkAssignment(prisma, {
              assigneeId: assignee.id,
              assigneeType: data.assigneeType,
              assigneeName: assignee.name,
              assigneeEmail: assignee.email,
              ticketNumbers: assignedTicketNumbers,
              ticketCount: assignedTicketNumbers.length,
              reason: data.reason.trim(),
              assignedBy: admin?.name || 'Admin'
            });
          } catch (notifError) {
            console.error('Error sending bulk assignment notification:', notifError);
          }

          results = ticketIds.map(id => ({ ticketId: id, success: true }));
          break;

        case 'tags':
          if (!data.tagIds || !Array.isArray(data.tagIds)) {
            return res.status(400).json({ error: 'Tag IDs array is required' });
          }

          // Add tags to all tickets
          for (const ticket of tickets) {
            // Remove existing tags first if action is 'replace', otherwise add
            if (data.action === 'replace') {
              await prisma.conversationTag.deleteMany({
                where: { conversationId: ticket.ticketNumber }
              });
            }

            // Add new tags
            for (const tagId of data.tagIds) {
              // Check if tag already exists
              const existingTag = await prisma.conversationTag.findFirst({
                where: {
                  conversationId: ticket.ticketNumber,
                  tagId: tagId
                }
              });

              if (!existingTag) {
                await prisma.conversationTag.create({
                  data: {
                    conversationId: ticket.ticketNumber,
                    tagId: tagId
                  }
                });
              }
            }

            // Create activity log
            await prisma.ticketActivity.create({
              data: {
                conversationId: ticket.ticketNumber,
                activityType: 'tags_updated',
                newValue: JSON.stringify(data.tagIds),
                reason: data.reason || 'Bulk tag update',
                performedBy: 'admin',
                performedByName: admin?.name || 'Admin'
              }
            });
          }

          results = ticketIds.map(id => ({ ticketId: id, success: true }));
          break;

        case 'notes':
          if (!data.content || !data.content.trim()) {
            return res.status(400).json({ error: 'Note content is required' });
          }

          // Add internal notes to all tickets
          for (const ticket of tickets) {
            await prisma.ticketNote.create({
              data: {
                conversationId: ticket.ticketNumber,
                content: data.content.trim(),
                createdBy: userId,
                createdByName: admin?.name || 'Admin',
                isInternal: true
              }
            });

            // Create activity log
            await prisma.ticketActivity.create({
              data: {
                conversationId: ticket.ticketNumber,
                activityType: 'note_added',
                newValue: 'Internal note added',
                reason: 'Bulk note addition',
                performedBy: 'admin',
                performedByName: admin?.name || 'Admin'
              }
            });
          }

          results = ticketIds.map(id => ({ ticketId: id, success: true }));
          break;

        default:
          return res.status(400).json({ error: `Unknown action: ${action}` });
      }

      res.status(200).json({
        success: true,
        message: `Bulk ${action} completed successfully`,
        results,
        affectedCount: tickets.length
      });

    } catch (error) {
      console.error('Error performing bulk action:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

