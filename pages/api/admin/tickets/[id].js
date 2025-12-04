import { PrismaClient } from '@prisma/client';
import { updateTATMetrics, formatTAT } from '../../../../lib/utils/tat';
import { 
  notifyTicketAssignment, 
  notifyStatusChange,
  notifyTicketResolvedCustomer,
  notifyTicketAssignedCustomer,
  notifyPriorityChangeCustomer
} from '@/lib/utils/notifications';
import { checkTicketSLARisk } from '@/lib/utils/sla-monitor';
import { getTicketSettings } from '../../../../lib/settings';
import { triggerWebhook } from '@/lib/utils/webhooks';
import { getCurrentUserId } from '@/lib/auth';
import { checkPermissionOrFail } from '@/lib/permissions';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id } = req.query;
  const userId = getCurrentUserId(req);

  if (req.method === 'GET') {
    // Check permission to view tickets
    if (userId) {
      const hasAccess = await checkPermissionOrFail(userId, 'admin.tickets', res);
      if (!hasAccess) return;
    }
    try {
      // Fetch ticket with related data
      const ticket = await prisma.conversation.findUnique({
        where: { id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              attachments: true
            }
          },
          assignee: true,
          customer: true,
          product: {
            select: {
              id: true,
              name: true
            }
          },
          accessory: {
            select: {
              id: true,
              name: true
            }
          },
          department: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      // If customer relation didn't load, try to fetch it separately
      let customerData = null;
      if (ticket.customer) {
        customerData = {
          id: ticket.customer.id,
          name: ticket.customer.name,
          email: ticket.customer.email,
          phone: ticket.customer.phone,
          company: ticket.customer.company,
          location: ticket.customer.location,
          createdAt: ticket.customer.createdAt
        };
      } else if (ticket.customerId) {
        // Fallback: if customerId exists but relation didn't load, fetch customer separately
        try {
          const customer = await prisma.customer.findUnique({
            where: { id: ticket.customerId }
          });
          if (customer) {
            customerData = {
              id: customer.id,
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              company: customer.company,
              location: customer.location,
              createdAt: customer.createdAt
            };
          }
        } catch (error) {
          console.error('Error fetching customer separately:', error);
        }
      } else if (ticket.customerName && ticket.customerName !== 'Unknown Customer') {
        // Last resort: if we have customerName but no customerId, try to find by name/email
        // This shouldn't normally happen, but handle it gracefully
        console.warn(`Ticket ${ticket.id} has customerName but no customerId`);
      }

      // Transform ticket for frontend
      const transformedTicket = {
        id: ticket.id,
        subject: ticket.subject || 'No subject',
        description: ticket.description || null,
        status: ticket.status,
        priority: ticket.priority || 'normal',
        category: ticket.category || null,
        productModel: ticket.productModel || null,
        productId: ticket.productId || null,
        accessoryId: ticket.accessoryId || null,
        product: ticket.product ? {
          id: ticket.product.id,
          name: ticket.product.name
        } : null,
        accessory: ticket.accessory ? {
          id: ticket.accessory.id,
          name: ticket.accessory.name
        } : null,
        assignee: ticket.assignee ? {
          id: ticket.assignee.id,
          name: ticket.assignee.name,
          email: ticket.assignee.email
        } : null,
        customer: customerData,
        customerId: ticket.customerId, // Include customerId for fallback
        customerName: ticket.customerName, // Include customerName for fallback
        department: ticket.department ? {
          id: ticket.department.id,
          name: ticket.department.name
        } : null,
        departmentId: ticket.departmentId,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        lastMessageAt: ticket.lastMessageAt,
        // TAT Metrics
        agentTATSeconds: ticket.agentTATSeconds,
        agentTATFormatted: ticket.agentTATSeconds ? formatTAT(ticket.agentTATSeconds) : null,
        firstResponseAt: ticket.firstResponseAt,
        firstResponseTimeSeconds: ticket.firstResponseTimeSeconds,
        firstResponseTimeFormatted: ticket.firstResponseTimeSeconds ? formatTAT(ticket.firstResponseTimeSeconds) : null,
        resolutionTimeSeconds: ticket.resolutionTimeSeconds,
        resolutionTimeFormatted: ticket.resolutionTimeSeconds ? formatTAT(ticket.resolutionTimeSeconds) : null
      };

      // Transform messages with sender information
      const transformedMessages = await Promise.all(ticket.messages.map(async (message) => {
        let senderAvatar = null;
        let senderName = null;
        
        // Fetch sender information based on senderType and senderId
        if (message.senderType === 'admin') {
          try {
            // If senderId is provided and valid, use it; otherwise find the default admin
            let admin = null;
            if (message.senderId) {
              admin = await prisma.admin.findUnique({
                where: { id: message.senderId },
                select: { name: true, avatarUrl: true }
              });
            }
            // If not found by ID, try to find default admin (for old messages with incorrect senderId)
            if (!admin) {
              admin = await prisma.admin.findFirst({
                where: { email: 'admin@wzatco.com' },
                select: { name: true, avatarUrl: true }
              });
            }
            if (admin) {
              senderName = admin.name;
              senderAvatar = admin.avatarUrl;
            }
          } catch (error) {
            console.error('Error fetching admin sender:', error);
          }
        } else if (message.senderType === 'agent' && message.senderId) {
          try {
            const agent = await prisma.agent.findUnique({
              where: { id: message.senderId },
              select: { name: true }
            });
            if (agent) {
              senderName = agent.name;
              // Agents don't have avatarUrl in schema, but we can check if they have one in the future
            }
          } catch (error) {
            console.error('Error fetching agent sender:', error);
          }
        } else if (message.senderType === 'customer') {
          // Use customer from ticket
          if (ticket.customer) {
            senderName = ticket.customer.name;
            // Customers don't have avatarUrl in schema currently
          }
        }
        
        return {
          id: message.id,
          content: message.content,
          senderType: message.senderType,
          senderId: message.senderId,
          senderName: senderName,
          senderAvatar: senderAvatar,
          createdAt: message.createdAt,
          attachments: message.attachments || [],
          replyTo: message.metadata?.replyTo || null
        };
      }));

      res.status(200).json({
        ticket: transformedTicket,
        messages: transformedMessages
      });

    } catch (error) {
      console.error('Error fetching ticket:', error);
      res.status(500).json({ 
        message: 'Internal server error',
        error: error.message 
      });
    }
  } else if (req.method === 'PATCH') {
    // Check permission to edit tickets
    if (userId) {
      const hasAccess = await checkPermissionOrFail(userId, 'admin.tickets.edit', res);
      if (!hasAccess) return;
    }
    
    try {
      const { status, priority, assigneeId, subject, category, productModel, productId, accessoryId, priorityReason, departmentId } = req.body;

      // Fetch current ticket to compare changes
      const currentTicket = await prisma.conversation.findUnique({
        where: { id },
        include: { 
          assignee: true,
          customer: true,
          product: {
            select: {
              id: true,
              name: true
            }
          },
          accessory: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!currentTicket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      const updateData = {};
      const activities = [];
      
      // Get admin profile for activity attribution
      const adminProfile = await prisma.admin.findFirst({
        where: { email: 'admin@wzatco.com' }
      }).catch(() => null);

      // Track changes and create activities
      console.log('Ticket update request:', { status, priority, assigneeId, subject, category, productModel });
      console.log('Current ticket state:', { 
        status: currentTicket.status, 
        priority: currentTicket.priority, 
        assigneeId: currentTicket.assigneeId,
        subject: currentTicket.subject,
        category: currentTicket.category,
        productModel: currentTicket.productModel
      });
      
      if (status !== undefined && status !== currentTicket.status) {
        // Check if reopening a closed ticket
        if ((currentTicket.status === 'closed' || currentTicket.status === 'resolved') && status === 'open') {
          const ticketSettings = await getTicketSettings();
          
          if (!ticketSettings.userCanReopen) {
            return res.status(403).json({
              message: 'Reopening closed tickets is not allowed.'
            });
          }
          
          // Check if ticket was closed within the allowed reopen time window
          const closedAt = currentTicket.updatedAt; // Assuming updatedAt reflects when it was closed
          const now = new Date();
          const daysSinceClosed = Math.floor((now - closedAt) / (1000 * 60 * 60 * 24));
          
          if (daysSinceClosed > ticketSettings.reopenTimeDays) {
            return res.status(403).json({
              message: `This ticket cannot be reopened. The maximum reopen time of ${ticketSettings.reopenTimeDays} days has passed.`
            });
          }
        }
        
        updateData.status = status;
        activities.push({
          conversationId: id,
          activityType: 'status_changed',
          oldValue: currentTicket.status,
          newValue: status,
          performedBy: 'admin',
          performedByName: adminProfile?.name || 'Admin'
        });

        // Update TAT metrics when status changes (especially for resolution)
        if (status === 'resolved' || status === 'closed') {
          try {
            await updateTATMetrics(prisma, id);
          } catch (tatError) {
            console.error('Error updating TAT metrics on status change:', tatError);
          }
        }
        
        // Create notification for status change
        try {
          await notifyStatusChange(prisma, {
            ticketId: id,
            ticketSubject: currentTicket.subject || id,
            oldStatus: currentTicket.status,
            newStatus: status,
            changedBy: adminProfile?.name || 'Admin',
            userId: currentTicket.assigneeId // Notify assigned agent, or null for all admins
          });
        } catch (notifError) {
          console.error('Error creating status change notification:', notifError);
          // Don't fail the request if notification fails
        }

        // Send email to customer if ticket is resolved/closed
        if ((status === 'resolved' || status === 'closed') && currentTicket.customer?.email) {
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const ticketLink = `${baseUrl}/ticket/${id}`;
            const feedbackLink = `${baseUrl}/ticket/${id}/feedback`;
            
            await notifyTicketResolvedCustomer(prisma, {
              ticketId: id,
              ticketSubject: currentTicket.subject || 'No subject',
              customerEmail: currentTicket.customer.email,
              customerName: currentTicket.customer.name || 'Customer',
              status,
              resolvedBy: currentTicket.assignee?.name || adminProfile?.name || 'Support Team',
              ticketLink,
              feedbackLink,
              sendEmail: true
            });
          } catch (customerEmailError) {
            console.error('Error sending resolved email to customer:', customerEmailError);
            // Don't fail the request if email fails
          }
        }

        // Check SLA risk after status change (if ticket is still open)
        if (status !== 'resolved' && status !== 'closed') {
          try {
            await checkTicketSLARisk(id);
          } catch (slaError) {
            console.error('Error checking SLA risk:', slaError);
            // Don't fail the request if SLA check fails
          }
        }
      }

      if (priority !== undefined && priority !== currentTicket.priority) {
        updateData.priority = priority;
        activities.push({
          conversationId: id,
          activityType: 'priority_changed',
          oldValue: currentTicket.priority || 'low',
          newValue: priority,
          reason: priorityReason || null,
          performedBy: 'admin',
          performedByName: adminProfile?.name || 'Admin'
        });

        // Send email to customer when priority changes (only for high/urgent changes)
        if (currentTicket.customer?.email) {
          try {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            const ticketLink = `${baseUrl}/ticket/${id}`;
            
            await notifyPriorityChangeCustomer(prisma, {
              ticketId: id,
              ticketSubject: currentTicket.subject || 'No subject',
              customerEmail: currentTicket.customer.email,
              customerName: currentTicket.customer.name || 'Customer',
              oldPriority: currentTicket.priority || 'low',
              newPriority: priority,
              ticketLink,
              sendEmail: true
            });
          } catch (customerEmailError) {
            console.error('Error sending priority change email to customer:', customerEmailError);
            // Don't fail the request if email fails
          }
        }
      }

      if (assigneeId !== undefined) {
        const wasAssigned = currentTicket.assigneeId !== null;
        const willBeAssigned = assigneeId !== null;
        
        if (currentTicket.assigneeId !== assigneeId) {
          updateData.assigneeId = assigneeId === null ? null : assigneeId;
          
          if (!wasAssigned && willBeAssigned) {
            // Fetch agent name for assignment
            const agent = await prisma.agent.findUnique({ where: { id: assigneeId } }).catch(() => null);
            activities.push({
              conversationId: id,
              activityType: 'assigned',
              oldValue: null,
              newValue: agent?.name || 'Agent',
              performedBy: 'admin',
              performedByName: adminProfile?.name || 'Admin'
            });
            
            // Create notification for agent assignment
            try {
              await notifyTicketAssignment(prisma, {
                ticketId: id,
                ticketSubject: currentTicket.subject || id,
                agentId: assigneeId,
                agentName: agent?.name || 'Agent',
                assignedBy: adminProfile?.name || 'Admin'
              });
            } catch (notifError) {
              console.error('Error creating assignment notification:', notifError);
              // Don't fail the request if notification fails
            }

            // Send email to customer when ticket is assigned
            if (currentTicket.customer?.email && agent) {
              try {
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
                const ticketLink = `${baseUrl}/ticket/${id}`;
                
                await notifyTicketAssignedCustomer(prisma, {
                  ticketId: id,
                  ticketSubject: currentTicket.subject || 'No subject',
                  customerEmail: currentTicket.customer.email,
                  customerName: currentTicket.customer.name || 'Customer',
                  agentName: agent.name,
                  agentEmail: agent.email,
                  ticketLink,
                  sendEmail: true
                });
              } catch (customerEmailError) {
                console.error('Error sending assignment email to customer:', customerEmailError);
                // Don't fail the request if email fails
              }
            }
          } else if (wasAssigned && !willBeAssigned) {
            activities.push({
              conversationId: id,
              activityType: 'unassigned',
              oldValue: currentTicket.assignee?.name || 'Agent',
              newValue: null,
              performedBy: 'admin',
              performedByName: adminProfile?.name || 'Admin'
            });
          } else if (wasAssigned && willBeAssigned) {
            // Reassignment
            const agent = await prisma.agent.findUnique({ where: { id: assigneeId } }).catch(() => null);
            activities.push({
              conversationId: id,
              activityType: 'assigned',
              oldValue: currentTicket.assignee?.name || 'Agent',
              newValue: agent?.name || 'Agent',
              performedBy: 'admin',
              performedByName: adminProfile?.name || 'Admin'
            });
          }
        }
      }

      if (subject !== undefined && subject !== currentTicket.subject) {
        updateData.subject = subject;
        activities.push({
          conversationId: id,
          activityType: 'subject_updated',
          oldValue: currentTicket.subject || '',
          newValue: subject,
          performedBy: 'admin',
          performedByName: adminProfile?.name || 'Admin'
        });
      }

      if (category !== undefined && category !== currentTicket.category) {
        updateData.category = category;
        activities.push({
          conversationId: id,
          activityType: 'category_updated',
          oldValue: currentTicket.category || 'WZATCO',
          newValue: category,
          performedBy: 'admin',
          performedByName: adminProfile?.name || 'Admin'
        });
      }

      if (productModel !== undefined && productModel !== currentTicket.productModel) {
        updateData.productModel = productModel;
        activities.push({
          conversationId: id,
          activityType: 'product_updated',
          oldValue: currentTicket.productModel || '',
          newValue: productModel,
          performedBy: 'admin',
          performedByName: adminProfile?.name || 'Admin'
        });
      }

      if (productId !== undefined && productId !== currentTicket.productId) {
        updateData.productId = productId === '' ? null : productId;
        const oldProduct = currentTicket.productId ? await prisma.product.findUnique({ where: { id: currentTicket.productId } }).catch(() => null) : null;
        const newProduct = productId ? await prisma.product.findUnique({ where: { id: productId } }).catch(() => null) : null;
        activities.push({
          conversationId: id,
          activityType: 'product_updated',
          oldValue: oldProduct?.name || currentTicket.productModel || '',
          newValue: newProduct?.name || '',
          performedBy: 'admin',
          performedByName: adminProfile?.name || 'Admin'
        });
      }

      if (accessoryId !== undefined && accessoryId !== currentTicket.accessoryId) {
        updateData.accessoryId = accessoryId === '' ? null : accessoryId;
        const oldAccessory = currentTicket.accessoryId ? await prisma.accessory.findUnique({ where: { id: currentTicket.accessoryId } }).catch(() => null) : null;
        const newAccessory = accessoryId ? await prisma.accessory.findUnique({ where: { id: accessoryId } }).catch(() => null) : null;
        activities.push({
          conversationId: id,
          activityType: 'accessory_updated',
          oldValue: oldAccessory?.name || '',
          newValue: newAccessory?.name || '',
          performedBy: 'admin',
          performedByName: adminProfile?.name || 'Admin'
        });
      }

      if (departmentId !== undefined && departmentId !== currentTicket.departmentId) {
        updateData.departmentId = departmentId === null || departmentId === '' ? null : departmentId;
        
        // Fetch department name for activity
        let oldDepartmentName = null;
        let newDepartmentName = null;
        
        if (currentTicket.departmentId) {
          const oldDept = await prisma.department.findUnique({ where: { id: currentTicket.departmentId } }).catch(() => null);
          oldDepartmentName = oldDept?.name || null;
        }
        
        if (departmentId && departmentId !== '') {
          const newDept = await prisma.department.findUnique({ where: { id: departmentId } }).catch(() => null);
          newDepartmentName = newDept?.name || null;
        }
        
        activities.push({
          conversationId: id,
          activityType: 'department_routed',
          oldValue: oldDepartmentName,
          newValue: newDepartmentName,
          performedBy: 'admin',
          performedByName: adminProfile?.name || 'Admin'
        });
      }

      // Update ticket
      const updatedTicket = await prisma.conversation.update({
        where: { id },
        data: updateData,
        include: {
          assignee: true,
          customer: true,
          product: {
            select: {
              id: true,
              name: true
            }
          },
          accessory: {
            select: {
              id: true,
              name: true
            }
          },
          department: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Create activity records (with error handling for when model doesn't exist yet)
      console.log(`Activities to create: ${activities.length}`, activities);
      if (activities.length > 0) {
        try {
          console.log(`Creating ${activities.length} ticket activity record(s):`, activities.map(a => a.activityType));
          const result = await prisma.ticketActivity.createMany({
            data: activities
          });
          console.log(`Successfully created ${result.count} ticket activity record(s)`);
        } catch (error) {
          // TicketActivity model might not exist yet if Prisma client hasn't been regenerated
          // Log but don't fail the request - activities will be tracked once Prisma is regenerated
          console.error('Could not create ticket activities. Error details:', {
            message: error.message,
            code: error.code,
            meta: error.meta,
            stack: error.stack
          });
          console.log('IMPORTANT: Make sure to stop the dev server and run "npx prisma generate" then restart the server');
        }
      }

      // Check SLA risk after any update (if ticket is still open)
      if (updatedTicket.status !== 'resolved' && updatedTicket.status !== 'closed') {
        try {
          await checkTicketSLARisk(id);
        } catch (slaError) {
          console.error('Error checking SLA risk after update:', slaError);
          // Don't fail the request if SLA check fails
        }
      }

      // Trigger webhooks for ticket updates
      try {
        const webhookPayload = {
          ticket: {
            id: updatedTicket.id,
            subject: updatedTicket.subject,
            status: updatedTicket.status,
            priority: updatedTicket.priority,
            category: updatedTicket.category,
            customerId: updatedTicket.customerId,
            customerName: updatedTicket.customerName,
            assigneeId: updatedTicket.assigneeId,
            assignee: updatedTicket.assignee,
            departmentId: updatedTicket.departmentId,
            department: updatedTicket.department,
            updatedAt: updatedTicket.updatedAt
          },
          changes: {
            status: status !== undefined && status !== currentTicket.status ? { old: currentTicket.status, new: status } : undefined,
            priority: priority !== undefined && priority !== currentTicket.priority ? { old: currentTicket.priority, new: priority } : undefined,
            assignee: assigneeId !== undefined && assigneeId !== currentTicket.assigneeId ? { old: currentTicket.assigneeId, new: assigneeId } : undefined,
            department: departmentId !== undefined && departmentId !== currentTicket.departmentId ? { old: currentTicket.departmentId, new: departmentId } : undefined
          }
        };

        // Determine which webhook event to trigger
        if (status !== undefined && status !== currentTicket.status) {
          if (status === 'resolved') {
            await triggerWebhook('ticket.resolved', webhookPayload);
          } else if (status === 'closed') {
            await triggerWebhook('ticket.closed', webhookPayload);
          } else if (currentTicket.status === 'closed' || currentTicket.status === 'resolved') {
            await triggerWebhook('ticket.reopened', webhookPayload);
          }
        }

        if (assigneeId !== undefined && assigneeId !== currentTicket.assigneeId) {
          await triggerWebhook('ticket.assigned', webhookPayload);
        }

        // Always trigger ticket.updated for any changes
        if (Object.keys(updateData).length > 0) {
          await triggerWebhook('ticket.updated', webhookPayload);
        }
      } catch (webhookError) {
        console.error('Error triggering webhooks for ticket update:', webhookError);
        // Don't fail the request if webhook fails
      }

      res.status(200).json({
        message: 'Ticket updated successfully',
        ticket: {
          id: updatedTicket.id,
          status: updatedTicket.status,
          priority: updatedTicket.priority,
          subject: updatedTicket.subject,
          category: updatedTicket.category,
          productModel: updatedTicket.productModel,
          assignee: updatedTicket.assignee,
          department: updatedTicket.department
        }
      });

    } catch (error) {
      console.error('Error updating ticket:', error);
      res.status(500).json({ 
        message: 'Internal server error',
        error: error.message 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }

  await prisma.$disconnect();
}
