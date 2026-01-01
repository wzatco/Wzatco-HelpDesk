import prisma from '../../../../lib/prisma';
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
      // Fetch ticket by ticketNumber (primary key)
      const ticket = await prisma.conversation.findUnique({
        where: { ticketNumber: id },
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
          },
          feedbacks: {
            orderBy: {
              submittedAt: 'desc'
            },
            take: 1 // Only get the most recent feedback
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
        console.warn(`Ticket ${ticket.ticketNumber} has customerName but no customerId`);
      }

      // Transform ticket for frontend
      const transformedTicket = {
        ticketNumber: ticket.ticketNumber,
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
        // Ticket creation form fields
        customerEmail: ticket.customerEmail || null,
        customerPhone: ticket.customerPhone || null,
        customerAltPhone: ticket.customerAltPhone || null,
        customerAddress: ticket.customerAddress || null,
        orderNumber: ticket.orderNumber || null,
        purchasedFrom: ticket.purchasedFrom || null,
        ticketBody: ticket.ticketBody || null,
        invoiceUrl: ticket.invoiceUrl || null,
        additionalDocuments: ticket.additionalDocuments ? (typeof ticket.additionalDocuments === 'string' ? JSON.parse(ticket.additionalDocuments) : ticket.additionalDocuments) : null,
        projectorImages: ticket.projectorImages ? (typeof ticket.projectorImages === 'string' ? JSON.parse(ticket.projectorImages) : ticket.projectorImages) : null,
        issueVideoLink: ticket.issueVideoLink || null,
        issueType: ticket.issueType || null,
        createdVia: ticket.createdVia || null,
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
        resolutionTimeFormatted: ticket.resolutionTimeSeconds ? formatTAT(ticket.resolutionTimeSeconds) : null,
        feedbacks: ticket.feedbacks && ticket.feedbacks.length > 0 ? ticket.feedbacks.map(fb => ({
          id: fb.id,
          rating: fb.rating,
          comment: fb.comment,
          customerName: fb.customerName,
          submittedAt: fb.submittedAt
        })) : []
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
          metadata: message.metadata || undefined,
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
      const { 
        status, priority, assigneeId, subject, category, productModel, productId, accessoryId, priorityReason, departmentId,
        customerEmail, customerPhone, customerAltPhone, customerAddress, orderNumber, purchasedFrom, ticketBody, invoiceUrl, issueVideoLink, issueType
      } = req.body;

      // Fetch current ticket by ticketNumber (primary key)
      const currentTicket = await prisma.conversation.findUnique({
        where: { ticketNumber: id },
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
          conversationId: currentTicket.ticketNumber,
          activityType: 'status_changed',
          oldValue: currentTicket.status,
          newValue: status,
          performedBy: 'admin',
          performedByName: adminProfile?.name || 'Admin'
        });

        // Update TAT metrics when status changes (especially for resolution)
        if (status === 'resolved' || status === 'closed') {
          try {
            await updateTATMetrics(prisma, currentTicket.ticketNumber);
          } catch (tatError) {
            console.error('Error updating TAT metrics on status change:', tatError);
          }
        }

        // Handle SLA timer pause/resume/stop based on status change
        try {
          const { SLAService } = await import('../../../../lib/sla-service');
          
          // Get the policy to check pause conditions
          const activeTimers = await prisma.sLATimer.findMany({
            where: {
              conversationId: currentTicket.ticketNumber,
              status: { in: ['running', 'paused'] }
            },
            include: {
              policy: true
            },
            take: 1
          });

          if (activeTimers.length > 0 && activeTimers[0].policy) {
            const policy = activeTimers[0].policy;
            
            // Stop SLA timers if ticket is resolved or closed
            if (status === 'resolved' || status === 'closed') {
              await SLAService.stopTimer(currentTicket.ticketNumber);
            }
            // Pause SLA if status is waiting or on hold (based on policy)
            else if ((policy.pauseOnWaiting && status === 'waiting') || 
                     (policy.pauseOnHold && status === 'on_hold')) {
              await SLAService.pauseTimer(currentTicket.ticketNumber, `Status changed to ${status}`);
            }
            // Resume SLA if status changed back to active from paused state
            else if ((currentTicket.status === 'waiting' || currentTicket.status === 'on_hold') && 
                     (status === 'open' || status === 'pending')) {
              await SLAService.resumeTimer(currentTicket.ticketNumber);
            }
            // Check pause conditions for other status changes
            else {
              await SLAService.checkPauseConditions(currentTicket.ticketNumber, status, policy);
            }
          }
        } catch (slaError) {
          // Log error but don't fail ticket update if SLA handling fails
          console.error('Error handling SLA on status change:', slaError);
        }
        
        // Create notification for status change
        try {
          await notifyStatusChange(prisma, {
            ticketId: currentTicket.ticketNumber,
            ticketSubject: currentTicket.subject || currentTicket.ticketNumber,
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
            const ticketLink = `${baseUrl}/admin/tickets/${currentTicket.ticketNumber}`;
            const feedbackLink = `${baseUrl}/ticket/${currentTicket.ticketNumber}/feedback`;
            
            await notifyTicketResolvedCustomer(prisma, {
              ticketId: currentTicket.ticketNumber,
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
            await checkTicketSLARisk(currentTicket.ticketNumber);
          } catch (slaError) {
            console.error('Error checking SLA risk:', slaError);
            // Don't fail the request if SLA check fails
          }
        }
      }

      if (priority !== undefined && priority !== currentTicket.priority) {
        updateData.priority = priority;
        activities.push({
          conversationId: currentTicket.ticketNumber,
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
            const ticketLink = `${baseUrl}/admin/tickets/${currentTicket.ticketNumber || currentTicket.id}`;
            
            await notifyPriorityChangeCustomer(prisma, {
              ticketId: currentTicket.ticketNumber,
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
            // Fetch agent info for assignment (including departmentId for auto-routing)
            const agent = await prisma.agent.findUnique({ 
              where: { id: assigneeId },
              select: { id: true, name: true, email: true, departmentId: true }
            }).catch(() => null);
            
            // Auto-update departmentId to match agent's department
            if (agent && agent.departmentId) {
              updateData.departmentId = agent.departmentId;
            }
            
            activities.push({
              conversationId: currentTicket.ticketNumber,
              activityType: 'assigned',
              oldValue: null,
              newValue: agent?.name || 'Agent',
              performedBy: 'admin',
              performedByName: adminProfile?.name || 'Admin'
            });
            
            // Create notification for agent assignment
            try {
              await notifyTicketAssignment(prisma, {
                ticketId: currentTicket.ticketNumber,
                ticketSubject: currentTicket.subject || currentTicket.ticketNumber,
                agentId: assigneeId,
                agentName: agent?.name || 'Agent',
                assignedBy: adminProfile?.name || 'Admin'
              });
            } catch (notifError) {
              console.error('Error creating assignment notification:', notifError);
              // Don't fail the request if notification fails
            }

            // Emit Socket.IO event for real-time assignment notification
            try {
              const { initialize } = await import('../../../../lib/chat-service');
              const chatService = initialize(); // Get singleton instance
              
              if (chatService) {
                chatService.emitTicketAssignment({
                  ticketId: currentTicket.ticketNumber,
                  assigneeId: assigneeId,
                  assigneeName: agent?.name || 'Agent',
                  assignedBy: adminProfile?.name || 'Admin',
                  ticket: {
                    ticketNumber: currentTicket.ticketNumber,
                    id: currentTicket.ticketNumber,
                    subject: currentTicket.subject,
                    priority: currentTicket.priority,
                    customer: currentTicket.customer ? {
                      name: currentTicket.customer.name,
                      email: currentTicket.customer.email
                    } : null,
                    customerName: currentTicket.customer?.name || currentTicket.customerName
                  }
                });
              }
            } catch (socketError) {
              console.error('Error emitting ticket:assigned socket event:', socketError);
              // Don't fail the request if socket emission fails
            }

            // Send email to customer when ticket is assigned
            if (currentTicket.customer?.email && agent) {
              try {
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
                const ticketLink = `${baseUrl}/admin/tickets/${currentTicket.ticketNumber || currentTicket.id}`;
                
                await notifyTicketAssignedCustomer(prisma, {
                  ticketId: currentTicket.ticketNumber,
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
              conversationId: currentTicket.ticketNumber,
              activityType: 'unassigned',
              oldValue: currentTicket.assignee?.name || 'Agent',
              newValue: null,
              performedBy: 'admin',
              performedByName: adminProfile?.name || 'Admin'
            });
          } else if (wasAssigned && willBeAssigned) {
            // Reassignment
            console.log('🔄 Reassignment detected - emitting socket event');
            const agent = await prisma.agent.findUnique({ 
              where: { id: assigneeId },
              select: { id: true, name: true, email: true, departmentId: true }
            }).catch(() => null);
            
            // Auto-update departmentId to match agent's department
            if (agent && agent.departmentId) {
              updateData.departmentId = agent.departmentId;
            }
            
            activities.push({
              conversationId: currentTicket.ticketNumber,
              activityType: 'assigned',
              oldValue: currentTicket.assignee?.name || 'Agent',
              newValue: agent?.name || 'Agent',
              performedBy: 'admin',
              performedByName: adminProfile?.name || 'Admin'
            });

            // Emit Socket.IO event for reassignment notification
            try {
              console.log('🎯 Attempting to import chat-service for reassignment socket emission');
              const { initialize } = await import('../../../../lib/chat-service');
              const chatService = initialize(); // Get singleton instance
              console.log('🎯 ChatService initialized:', !!chatService);
              
              if (chatService) {
                console.log('🎯 Calling emitTicketAssignment for reassignment');
                chatService.emitTicketAssignment({
                  ticketId: currentTicket.ticketNumber,
                  assigneeId: assigneeId,
                  assigneeName: agent?.name || 'Agent',
                  assignedBy: adminProfile?.name || 'Admin',
                  ticket: {
                    ticketNumber: currentTicket.ticketNumber,
                    id: currentTicket.ticketNumber,
                    subject: currentTicket.subject,
                    priority: currentTicket.priority,
                    customer: currentTicket.customer ? {
                      name: currentTicket.customer.name,
                      email: currentTicket.customer.email
                    } : null,
                    customerName: currentTicket.customer?.name || currentTicket.customerName
                  }
                });
                console.log('✅ Reassignment socket event emission completed');
              } else {
                console.warn('⚠️ ChatService is null/undefined for reassignment');
              }
            } catch (socketError) {
              console.error('❌ Error emitting ticket:assigned socket event for reassignment:', socketError);
              // Don't fail the request if socket emission fails
            }
          }
        }
      }

      if (subject !== undefined && subject !== currentTicket.subject) {
        updateData.subject = subject;
        activities.push({
          conversationId: currentTicket.ticketNumber,
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
          conversationId: currentTicket.ticketNumber,
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
          conversationId: currentTicket.ticketNumber,
          activityType: 'product_updated',
          oldValue: currentTicket.productModel || '',
          newValue: productModel,
          performedBy: 'admin',
          performedByName: adminProfile?.name || 'Admin'
        });
      }

      if (productId !== undefined && productId !== currentTicket.productId) {
        // If a valid productId is selected, clear productModel and set productId
        if (productId && productId.trim() !== '') {
          // Validate productId exists
          const product = await prisma.product.findUnique({ where: { id: productId.trim() } }).catch(() => null);
          if (product) {
            updateData.productId = productId.trim();
            updateData.productModel = null; // Clear custom product name when valid product is selected
            const oldProduct = currentTicket.productId ? await prisma.product.findUnique({ where: { id: currentTicket.productId } }).catch(() => null) : null;
            activities.push({
              conversationId: currentTicket.ticketNumber,
              activityType: 'product_updated',
              oldValue: oldProduct?.name || currentTicket.productModel || '',
              newValue: product.name,
              performedBy: 'admin',
              performedByName: adminProfile?.name || 'Admin'
            });
          } else {
            // Invalid productId - treat as custom product name
            updateData.productId = null;
            updateData.productModel = productId.trim();
            activities.push({
              conversationId: currentTicket.ticketNumber,
              activityType: 'product_updated',
              oldValue: currentTicket.product?.name || currentTicket.productModel || '',
              newValue: productId.trim(),
              performedBy: 'admin',
              performedByName: adminProfile?.name || 'Admin'
            });
          }
        } else {
          // Empty productId - clear both
          updateData.productId = null;
          updateData.productModel = null;
          activities.push({
            conversationId: currentTicket.ticketNumber,
            activityType: 'product_updated',
            oldValue: currentTicket.product?.name || currentTicket.productModel || '',
            newValue: '',
            performedBy: 'admin',
            performedByName: adminProfile?.name || 'Admin'
          });
        }
      }

      if (accessoryId !== undefined && accessoryId !== currentTicket.accessoryId) {
        updateData.accessoryId = accessoryId === '' ? null : accessoryId;
        const oldAccessory = currentTicket.accessoryId ? await prisma.accessory.findUnique({ where: { id: currentTicket.accessoryId } }).catch(() => null) : null;
        const newAccessory = accessoryId ? await prisma.accessory.findUnique({ where: { id: accessoryId } }).catch(() => null) : null;
        activities.push({
          conversationId: currentTicket.ticketNumber,
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
          conversationId: currentTicket.ticketNumber,
          activityType: 'department_routed',
          oldValue: oldDepartmentName,
          newValue: newDepartmentName,
          performedBy: 'admin',
          performedByName: adminProfile?.name || 'Admin'
        });
      }

      // Handle ticket creation details fields
      const creationDetailsFields = {
        customerEmail,
        customerPhone,
        customerAltPhone,
        customerAddress,
        orderNumber,
        purchasedFrom,
        ticketBody,
        invoiceUrl,
        issueVideoLink,
        issueType
      };

      let creationDetailsChanged = false;
      for (const [field, value] of Object.entries(creationDetailsFields)) {
        if (value !== undefined) {
          const currentValue = currentTicket[field] || '';
          const newValue = value || '';
          if (currentValue !== newValue) {
            updateData[field] = newValue === '' ? null : newValue;
            creationDetailsChanged = true;
          }
        }
      }

      if (creationDetailsChanged) {
        activities.push({
          conversationId: currentTicket.ticketNumber,
          activityType: 'creation_details_updated',
          oldValue: 'Original creation details',
          newValue: 'Updated by admin',
          performedBy: 'admin',
          performedByName: adminProfile?.name || 'Admin'
        });
      }

      // Update ticket by ticketNumber (primary key)
      // Auto-stop active worklogs when ticket is resolved or closed
      if (updateData.status === 'resolved' || updateData.status === 'closed') {
        try {
          // Find all active worklogs for this ticket
          const activeWorklogs = await prisma.worklog.findMany({
            where: {
              ticketNumber: currentTicket.ticketNumber,
              endedAt: null // Active sessions
            }
          });

          // Stop all active worklogs
          const stopReason = updateData.status === 'resolved' ? 'Ticket Resolved' : 'Ticket Closed';
          const endTime = new Date();

          for (const worklog of activeWorklogs) {
            const durationSeconds = Math.floor((endTime - new Date(worklog.startedAt)) / 1000);
            
            await prisma.worklog.update({
              where: { id: worklog.id },
              data: {
                endedAt: endTime,
                durationSeconds,
                stopReason,
                isSystemAuto: true
              }
            });
          }

          if (activeWorklogs.length > 0) {
            console.log(`Auto-stopped ${activeWorklogs.length} worklog(s) for ticket ${currentTicket.ticketNumber} (${updateData.status})`);
          }
        } catch (worklogError) {
          console.error('Error auto-stopping worklogs:', worklogError);
          // Don't fail the request if worklog stopping fails
        }
      }

      const updatedTicket = await prisma.conversation.update({
        where: { ticketNumber: currentTicket.ticketNumber },
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

      // Run automation for ticket update
      try {
        const { runAutomation } = await import('../../../../lib/automation/engine');
        await runAutomation(updatedTicket, 'TICKET_UPDATED');
        
        // Also trigger automation for assignment change if assignee changed
        if (assigneeId !== undefined && assigneeId !== currentTicket.assigneeId) {
          await runAutomation(updatedTicket, 'TICKET_ASSIGNED');
        }
      } catch (automationError) {
        // Log error but don't fail ticket update if automation fails
        console.error('Error running automation:', automationError);
      }

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
          await checkTicketSLARisk(updatedTicket.ticketNumber);
        } catch (slaError) {
          console.error('Error checking SLA risk after update:', slaError);
          // Don't fail the request if SLA check fails
        }
      }

      // Emit Socket.IO events for real-time updates (Admin-to-Agent uplink)
      try {
        const io = req.socket?.server?.io || global.io;
        
        if (io) {
          // Always emit general update event
          io.emit('ticket:updated', {
            ticketNumber: updatedTicket.ticketNumber,
            updates: updateData
          });

          // Emit specific status change event if status was updated
          if (status !== undefined && status !== currentTicket.status) {
            io.emit('ticket:status:changed', {
              ticketNumber: updatedTicket.ticketNumber,
              oldStatus: currentTicket.status,
              newStatus: updatedTicket.status
            });
          }

          // Emit specific priority change event if priority was updated
          if (priority !== undefined && priority !== currentTicket.priority) {
            io.emit('ticket:priority:changed', {
              ticketNumber: updatedTicket.ticketNumber,
              oldPriority: currentTicket.priority,
              newPriority: updatedTicket.priority
            });
          }

          // Note: ticket:assigned is already handled via chatService.emitTicketAssignment above
          // which emits to the specific agent's room. We don't need to duplicate it here.
        }
      } catch (socketError) {
        console.error('Error emitting socket events for ticket update:', socketError);
        // Don't fail the request if socket emission fails
      }

      // Trigger webhooks for ticket updates
      try {
        const webhookPayload = {
          ticket: {
            ticketNumber: updatedTicket.ticketNumber,
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
          ticketNumber: updatedTicket.ticketNumber,
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
  // NOTE: Do NOT disconnect Prisma here - it's a singleton shared across all requests
}
