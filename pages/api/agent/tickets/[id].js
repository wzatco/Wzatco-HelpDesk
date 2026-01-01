import prisma from '../../../../lib/prisma';
import { getCurrentAgentId } from '../../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  const { id } = req.query;
  const agentId = await getCurrentAgentId(req);

  if (!agentId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      // Fetch ticket by ticketNumber
      // CRITICAL: Fetch ALL messages (customer, agent, admin) - no filtering
      const ticket = await prisma.conversation.findUnique({
        where: { ticketNumber: id },
        include: {
          messages: {
            // CRITICAL: No where clause - fetch ALL messages regardless of senderType
            orderBy: { createdAt: 'asc' },
            include: {
              attachments: true
            }
            // NOTE: Do NOT add a where clause here - we need ALL messages (customer, agent, admin)
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
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
          tags: {
            include: {
              Tag: true
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

      // GLOBAL SEARCH FEATURE: Allow any active agent to view any ticket (read access)
      // This enables agents to search and view tickets assigned to others
      // Write access (updates) will still be restricted based on ownership/permissions
      // No access check needed for GET requests - all agents can view all tickets

      // Fetch additional data
      const [worklogs, activities, notes, customerFull] = await Promise.all([
        prisma.worklog.findMany({
          where: { conversationId: ticket.ticketNumber },
          include: { Agent: { select: { id: true, name: true, email: true } } },
          orderBy: { startedAt: 'desc' }
        }).catch(() => []),
        prisma.ticketActivity.findMany({
          where: { conversationId: ticket.ticketNumber },
          include: { agent: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' }
        }).catch(() => []),
        prisma.ticketNote.findMany({
          where: { conversationId: ticket.ticketNumber },
          orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }]
        }).catch(() => []),
        ticket.customerId ? prisma.customer.findUnique({
          where: { id: ticket.customerId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            company: true,
            location: true,
            createdAt: true
          }
        }).catch(() => null) : Promise.resolve(null)
      ]);

      // Calculate TAT metrics
      const { formatTAT } = await import('../../../../lib/utils/tat');
      let agentTATFormatted = null;
      let firstResponseTimeFormatted = null;
      let resolutionTimeFormatted = null;

      if (ticket.agentTATSeconds) {
        agentTATFormatted = formatTAT(ticket.agentTATSeconds);
      }
      if (ticket.firstResponseTimeSeconds !== null && ticket.firstResponseTimeSeconds !== undefined) {
        firstResponseTimeFormatted = formatTAT(ticket.firstResponseTimeSeconds);
      }
      if (ticket.resolutionTimeSeconds) {
        resolutionTimeFormatted = formatTAT(ticket.resolutionTimeSeconds);
      }

      // Fetch previous owner if exists
      let previousOwner = null;
      if (ticket.previousOwnerId) {
        previousOwner = await prisma.agent.findUnique({
          where: { id: ticket.previousOwnerId },
          select: { id: true, name: true, email: true }
        }).catch(() => null);
      }

      // Transform ticket for frontend
      const transformedTicket = {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject || 'No subject',
        description: ticket.description || null,
        status: ticket.status,
        priority: ticket.priority || 'low',
        category: ticket.category || null,
        isClaimable: ticket.isClaimable || false,
        unassignedReason: ticket.unassignedReason || null,
        previousOwner: previousOwner,
        customerName: ticket.customerName || ticket.customer?.name || customerFull?.name || null,
        customerEmail: ticket.customerEmail || ticket.customer?.email || customerFull?.email || null,
        customerPhone: ticket.customerPhone || ticket.customer?.phone || customerFull?.phone || null,
        customerAltPhone: ticket.customerAltPhone || null,
        customerAddress: ticket.customerAddress || customerFull?.address || null,
        assignee: ticket.assignee ? {
          id: ticket.assignee.id,
          name: ticket.assignee.name,
          email: ticket.assignee.email
        } : null,
        assigneeId: ticket.assigneeId,
        customer: customerFull || (ticket.customer ? {
          id: ticket.customer.id,
          name: ticket.customer.name,
          email: ticket.customer.email,
          phone: ticket.customer.phone,
          address: null,
          company: null,
          location: null,
          createdAt: null
        } : null),
        customerId: ticket.customerId,
        product: ticket.product ? {
          id: ticket.product.id,
          name: ticket.product.name
        } : null,
        productId: ticket.productId,
        productModel: ticket.productModel || null,
        accessory: ticket.accessory ? {
          id: ticket.accessory.id,
          name: ticket.accessory.name
        } : null,
        accessoryId: ticket.accessoryId,
        department: ticket.department ? {
          id: ticket.department.id,
          name: ticket.department.name
        } : null,
        departmentId: ticket.departmentId,
        tags: ticket.tags?.map(ct => ({
          ...ct.Tag,
          conversationTagId: ct.id,
          status: ct.status || null
        })) || [],
        orderNumber: ticket.orderNumber || null,
        purchasedFrom: ticket.purchasedFrom || null,
        ticketBody: ticket.ticketBody || null,
        invoiceUrl: ticket.invoiceUrl || null,
        additionalDocuments: ticket.additionalDocuments ? (typeof ticket.additionalDocuments === 'string' ? JSON.parse(ticket.additionalDocuments) : ticket.additionalDocuments) : null,
        projectorImages: ticket.projectorImages ? (typeof ticket.projectorImages === 'string' ? JSON.parse(ticket.projectorImages) : ticket.projectorImages) : null,
        issueVideoLink: ticket.issueVideoLink || null,
        issueType: ticket.issueType || null,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        lastMessageAt: ticket.lastMessageAt,
        firstResponseAt: ticket.firstResponseAt,
        firstResponseTimeSeconds: ticket.firstResponseTimeSeconds,
        agentTATSeconds: ticket.agentTATSeconds,
        resolutionTimeSeconds: ticket.resolutionTimeSeconds,
        agentTATFormatted,
        firstResponseTimeFormatted,
        resolutionTimeFormatted,
        isAssigned: ticket.assigneeId === agentId,
        isUnassigned: ticket.assigneeId === null,
        feedbacks: ticket.feedbacks && ticket.feedbacks.length > 0 ? ticket.feedbacks.map(fb => ({
          id: fb.id,
          rating: fb.rating,
          comment: fb.comment,
          customerName: fb.customerName,
          submittedAt: fb.submittedAt
        })) : []
      };

      // CRITICAL: Ensure ALL messages are included - no filtering
      // Log for debugging
      if (ticket.messages.length > 0) {
        const messageTypeBreakdown = ticket.messages.reduce((acc, msg) => {
          acc[msg.senderType] = (acc[msg.senderType] || 0) + 1;
          return acc;
        }, {});
        console.log('[API] Messages fetched:', {
          total: ticket.messages.length,
          byType: messageTypeBreakdown
        });
      }

      // Transform messages - CRITICAL: Process ALL messages regardless of senderType
      // Ensure we process every single message - no filtering, no skipping
      const transformedMessages = await Promise.all(
        ticket.messages
          .filter(msg => msg && msg.id) // Only filter out completely invalid messages
          .map(async (message) => {
        let senderAvatar = null;
        let senderName = null;
        
        // Explicitly handle each sender type
        if (message.senderType === 'admin') {
          try {
            const admin = await prisma.admin.findFirst({
              select: { name: true, avatarUrl: true }
            });
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
            }
          } catch (error) {
            console.error('Error fetching agent sender:', error);
          }
        } else if (message.senderType === 'customer') {
          // CRITICAL: Customer messages - try multiple sources for customer name
          // Priority: ticket.customer.name > ticket.customerName > message metadata > fallback
          if (ticket.customer && ticket.customer.name) {
            senderName = ticket.customer.name;
          } else if (ticket.customerName) {
            senderName = ticket.customerName;
          } else if (message.metadata && typeof message.metadata === 'object' && message.metadata.senderName) {
            senderName = message.metadata.senderName;
          } else {
            senderName = 'Customer'; // Fallback
          }
          
          // Debug customer message processing
          if (!senderName || senderName === 'Customer') {
            console.log('[API Debug] Customer message with fallback name:', {
              messageId: message.id,
              ticketCustomer: ticket.customer?.name,
              ticketCustomerName: ticket.customerName,
              messageMetadata: message.metadata
            });
          }
        } else {
          // Handle unknown sender types - should not happen but log for debugging
          console.warn('[API Debug] Unknown senderType:', message.senderType, 'for message:', message.id);
          senderName = message.senderType || 'Unknown';
        }
        
        return {
          id: message.id,
          content: message.content,
          senderType: message.senderType,
          senderId: message.senderId,
          senderName: senderName || 'Unknown', // Ensure senderName is never null/undefined
          senderAvatar: senderAvatar,
          createdAt: message.createdAt,
          metadata: message.metadata || undefined,
          replyTo: message.metadata?.replyTo || null,
          attachments: message.attachments || []
        };
      }));
      
      // CRITICAL: Log transformed messages to verify customer messages are included
      const transformedTypeBreakdown = transformedMessages.reduce((acc, msg) => {
        acc[msg.senderType] = (acc[msg.senderType] || 0) + 1;
        return acc;
      }, {});
      console.log('[API Debug] Transformed messages count:', transformedMessages.length);
      console.log('[API Debug] Transformed message types:', transformedTypeBreakdown);

      // CRITICAL: Final validation - ensure all messages are included
      if (ticket.messages.length !== transformedMessages.length) {
        console.error('[API Error] Message count mismatch!', {
          rawCount: ticket.messages.length,
          transformedCount: transformedMessages.length
        });
      }

      res.status(200).json({
        ticket: transformedTicket,
        messages: transformedMessages, // CRITICAL: This should include ALL messages (customer, agent, admin)
        worklogs: worklogs || [],
        activities: activities || [],
        notes: notes || []
      });

    } catch (error) {
      console.error('Error fetching agent ticket:', error);
      res.status(500).json({ 
        message: 'Internal server error',
        error: error.message 
      });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { status, priority, priorityReason, subject, category, productId, accessoryId, productModel } = req.body;

      // Verify ticket exists and agent has access
      const ticket = await prisma.conversation.findUnique({
        where: { ticketNumber: id },
        include: {
          assignee: { select: { id: true, departmentId: true, name: true } },
          department: { select: { id: true } }
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // READ-ONLY ENFORCEMENT: Only the assigned agent can update tickets
      // Exception: Unassigned tickets in agent's department can be updated
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { departmentId: true, name: true }
      });

      // Check if agent is the owner (assigned) OR ticket is unassigned in their department
      const isOwner = ticket.assigneeId === agentId;
      const isUnassignedInDepartment = 
        ticket.assigneeId === null && 
        agent?.departmentId && 
        agent.departmentId === ticket.departmentId;

      // If ticket is assigned to someone else, deny access (read-only mode)
      if (!isOwner && !isUnassignedInDepartment) {
        return res.status(403).json({ 
          error: 'You do not have permission to update this ticket. This ticket is assigned to another agent and is in read-only mode.' 
        });
      }

      // Build update data and activities
      const updateData = {};
      const activities = [];

      if (status && ['open', 'pending', 'resolved', 'closed'].includes(status)) {
        updateData.status = status;
        if (status !== ticket.status) {
          activities.push({
            conversationId: ticket.ticketNumber,
            activityType: 'status_changed',
            oldValue: ticket.status,
            newValue: status,
            reason: null,
            performedBy: 'agent',
            performedByName: agent?.name || 'Agent'
          });
        }
      }

      if (priority && ['urgent', 'high', 'medium', 'low'].includes(priority)) {
        updateData.priority = priority;
        if (priority !== ticket.priority) {
          activities.push({
            conversationId: ticket.ticketNumber,
            activityType: 'priority_changed',
            oldValue: ticket.priority || 'low',
            newValue: priority,
            reason: priorityReason || null,
            performedBy: 'agent',
            performedByName: agent?.name || 'Agent'
          });
        }
      }

      if (subject !== undefined && subject !== ticket.subject) {
        updateData.subject = subject;
        activities.push({
          conversationId: ticket.ticketNumber,
          activityType: 'subject_updated',
          oldValue: ticket.subject || '',
          newValue: subject,
          performedBy: 'agent',
          performedByName: agent?.name || 'Agent'
        });
      }

      if (category !== undefined && category !== ticket.category) {
        updateData.category = category;
        activities.push({
          conversationId: ticket.ticketNumber,
          activityType: 'category_updated',
          oldValue: ticket.category || 'WZATCO',
          newValue: category,
          performedBy: 'agent',
          performedByName: agent?.name || 'Agent'
        });
      }

      if (productId !== undefined && productId !== ticket.productId) {
        // If a valid productId is selected, clear productModel and set productId
        if (productId && productId.trim() !== '') {
          // Validate productId exists
          const product = await prisma.product.findUnique({ where: { id: productId.trim() } }).catch(() => null);
          if (product) {
            updateData.productId = productId.trim();
            updateData.productModel = null; // Clear custom product name when valid product is selected
            const oldProduct = ticket.productId ? await prisma.product.findUnique({ where: { id: ticket.productId } }).catch(() => null) : null;
            activities.push({
              conversationId: ticket.ticketNumber,
              activityType: 'product_updated',
              oldValue: oldProduct?.name || ticket.productModel || '',
              newValue: product.name,
              performedBy: 'agent',
              performedByName: agent?.name || 'Agent'
            });
          } else {
            // Invalid productId - treat as custom product name
            updateData.productId = null;
            updateData.productModel = productId.trim();
            activities.push({
              conversationId: ticket.ticketNumber,
              activityType: 'product_updated',
              oldValue: ticket.product?.name || ticket.productModel || '',
              newValue: productId.trim(),
              performedBy: 'agent',
              performedByName: agent?.name || 'Agent'
            });
          }
        } else {
          // Empty productId - clear both
          updateData.productId = null;
          updateData.productModel = null;
          activities.push({
            conversationId: ticket.ticketNumber,
            activityType: 'product_updated',
            oldValue: ticket.product?.name || ticket.productModel || '',
            newValue: '',
            performedBy: 'agent',
            performedByName: agent?.name || 'Agent'
          });
        }
      }

      if (accessoryId !== undefined && accessoryId !== ticket.accessoryId) {
        updateData.accessoryId = accessoryId === '' ? null : accessoryId;
        const oldAccessory = ticket.accessoryId ? await prisma.accessory.findUnique({ where: { id: ticket.accessoryId } }).catch(() => null) : null;
        const newAccessory = accessoryId ? await prisma.accessory.findUnique({ where: { id: accessoryId } }).catch(() => null) : null;
        activities.push({
          conversationId: ticket.ticketNumber,
          activityType: 'accessory_updated',
          oldValue: oldAccessory?.name || '',
          newValue: newAccessory?.name || '',
          performedBy: 'agent',
          performedByName: agent?.name || 'Agent'
        });
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      // Update ticket
      const updatedTicket = await prisma.conversation.update({
        where: { ticketNumber: id },
        data: updateData
      });

      // Auto-stop active worklogs when ticket is resolved or closed
      if (updateData.status === 'resolved' || updateData.status === 'closed') {
        try {
          // Find all active worklogs for this ticket
          const activeWorklogs = await prisma.worklog.findMany({
            where: {
              ticketNumber: id,
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
            console.log(`Auto-stopped ${activeWorklogs.length} worklog(s) for ticket ${id} (${updateData.status})`);
          }
        } catch (worklogError) {
          console.error('Error auto-stopping worklogs:', worklogError);
          // Don't fail the request if worklog stopping fails
        }
      }

      // Create activity records
      if (activities.length > 0) {
        try {
          await prisma.ticketActivity.createMany({
            data: activities
          });
        } catch (activityError) {
          console.error('Error creating ticket activities:', activityError);
          // Don't fail the request if activity logging fails
        }
      }

      // Emit Socket.IO events for real-time updates
      const io = req.io || global.io;
      if (io) {
        // Always emit general update event
        io.emit('ticket:updated', {
          ticketNumber: updatedTicket.ticketNumber,
          updates: updateData
        });

        // Emit specific status change event if status was updated
        if (updateData.status && updateData.status !== ticket.status) {
          io.emit('ticket:status:changed', {
            ticketNumber: updatedTicket.ticketNumber,
            oldStatus: ticket.status,
            newStatus: updateData.status
          });
        }

        // Emit specific priority change event if priority was updated
        if (updateData.priority && updateData.priority !== ticket.priority) {
          io.emit('ticket:priority:changed', {
            ticketNumber: updatedTicket.ticketNumber,
            oldPriority: ticket.priority,
            newPriority: updateData.priority
          });
        }
      }

      res.status(200).json({
        success: true,
        ticket: {
          ticketNumber: updatedTicket.ticketNumber,
          status: updatedTicket.status,
          priority: updatedTicket.priority
        }
      });

    } catch (error) {
      console.error('Error updating agent ticket:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

