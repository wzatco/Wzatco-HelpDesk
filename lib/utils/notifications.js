/**
 * Utility functions for creating and managing notifications
 */

import { sendEmail } from '../email/service';
import { getNotificationSettings } from '../settings';
import { 
  ticketAssignmentTemplate, 
  ticketStatusChangeTemplate, 
  mentionTemplate, 
  slaRiskTemplate,
  ticketCreatedTemplate,
  customerMessageTemplate,
  ticketCreatedCustomerTemplate,
  ticketResolvedCustomerTemplate,
  ticketAssignedCustomerTemplate,
  priorityChangeCustomerTemplate,
  firstResponseCustomerTemplate,
  customerMessageAgentTemplate
} from '../email/templates';

/**
 * Get user email address (from Agent or Admin)
 */
async function getUserEmail(prisma, userId) {
  if (!userId) return null;
  
  try {
    // Try to find as Agent first
    const agent = await prisma.agent.findUnique({
      where: { id: userId },
      select: { email: true }
    });
    if (agent?.email) return agent.email;
    
    // Try to find as Admin
    const admin = await prisma.admin.findUnique({
      where: { id: userId },
      select: { email: true, notifyEmail: true }
    });
    if (admin?.email && admin.notifyEmail !== false) return admin.email;
    
    return null;
  } catch (error) {
    console.error('Error fetching user email:', error);
    return null;
  }
}

/**
 * Get all admin emails (for global notifications)
 */
async function getAllAdminEmails(prisma) {
  try {
    const admins = await prisma.admin.findMany({
      where: {
        notifyEmail: { not: false }
      },
      select: { email: true }
    });
    return admins.map(a => a.email).filter(Boolean);
  } catch (error) {
    console.error('Error fetching admin emails:', error);
    return [];
  }
}

/**
 * Create a notification and optionally send email
 */
export async function createNotification(prisma, {
  userId = null,
  type,
  title,
  message,
  link = null,
  metadata = null,
  sendEmail: shouldSendEmail = false,
  emailSubject = null,
  emailHtml = null,
  triggerType = null // e.g., 'ticketCreated', 'ticketAssigned', etc.
}) {
  try {
    // Check notification settings
    const notificationSettings = await getNotificationSettings();
    
    // If notifications are disabled, return early
    if (!notificationSettings.notificationEnabled) {
      console.log('Notifications are disabled. Skipping notification creation.');
      return null;
    }
    
    // If trigger type is specified, check if it's enabled
    if (triggerType && notificationSettings.triggers[triggerType] === false) {
      console.log(`Notification trigger "${triggerType}" is disabled. Skipping notification creation.`);
      return null;
    }
    
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });

    // Send email if requested
    if (shouldSendEmail && emailSubject && emailHtml) {
      try {
        let recipientEmails = [];
        
        if (userId) {
          // Send to specific user
          const userEmail = await getUserEmail(prisma, userId);
          if (userEmail) recipientEmails.push(userEmail);
        } else {
          // Send to all admins
          recipientEmails = await getAllAdminEmails(prisma);
        }
        
        if (recipientEmails.length > 0) {
          // Send email asynchronously (don't wait for it)
          sendEmail({
            to: recipientEmails,
            subject: emailSubject,
            html: emailHtml
          }).catch(error => {
            console.error('Failed to send notification email:', error);
          });
        }
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
        // Don't fail the notification creation if email fails
      }
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Create notification for ticket assignment
 */
export async function notifyTicketAssignment(prisma, {
  ticketId,
  ticketSubject,
  agentId,
  agentName,
  assignedBy = 'admin',
  sendEmail: shouldSendEmail = true
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const ticketLink = `${baseUrl}/admin/tickets/${ticketId}`;
  
  const emailHtml = await ticketAssignmentTemplate({
    ticketId,
    ticketSubject: ticketSubject || 'No subject',
    agentName: agentName || 'Agent',
    assignedBy,
    ticketLink
  });

  return await createNotification(prisma, {
    userId: agentId, // Notify the assigned agent
    type: 'assignment',
    title: 'New Ticket Assigned',
    message: `You have been assigned to ticket: ${ticketSubject || ticketId}`,
    link: `/admin/tickets/${ticketId}`,
    metadata: {
      ticketId,
      agentId,
      agentName,
      assignedBy
    },
    sendEmail: shouldSendEmail,
    emailSubject: `New Ticket Assigned: ${ticketId}`,
    emailHtml,
    triggerType: 'ticketAssigned'
  });
}

/**
 * Create notification for bulk ticket assignment
 */
export async function notifyBulkAssignment(prisma, {
  assigneeId,
  assigneeType, // 'agent' or 'admin'
  assigneeName,
  assigneeEmail,
  ticketNumbers,
  ticketCount,
  reason,
  assignedBy = 'admin',
  sendEmail: shouldSendEmail = true
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  // Create a list of ticket links
  const ticketLinks = ticketNumbers.slice(0, 10).map(ticketId => 
    `${baseUrl}/${assigneeType === 'admin' ? 'admin' : 'agent'}/tickets/${ticketId}`
  );
  
  // Create message with ticket list
  const ticketList = ticketNumbers.slice(0, 10).map(t => `• ${t}`).join('\n');
  const moreTickets = ticketCount > 10 ? `\n... and ${ticketCount - 10} more ticket(s)` : '';
  
  const message = `You have been assigned ${ticketCount} ticket(s) by ${assignedBy}.\n\nReason: ${reason}\n\nTickets:\n${ticketList}${moreTickets}`;
  
  // Create simple email HTML
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #7c3aed;">Bulk Ticket Assignment</h2>
      <p>Hello ${assigneeName},</p>
      <p>You have been assigned <strong>${ticketCount} ticket(s)</strong> by ${assignedBy}.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <h3>Assigned Tickets:</h3>
      <ul>
        ${ticketNumbers.slice(0, 20).map(ticketId => 
          `<li><a href="${baseUrl}/${assigneeType === 'admin' ? 'admin' : 'agent'}/tickets/${ticketId}">${ticketId}</a></li>`
        ).join('')}
        ${ticketCount > 20 ? `<li>... and ${ticketCount - 20} more ticket(s)</li>` : ''}
      </ul>
      <p style="margin-top: 20px;">
        <a href="${baseUrl}/${assigneeType === 'admin' ? 'admin' : 'agent'}/tickets" 
           style="background-color: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          View All Tickets
        </a>
      </p>
    </div>
  `;

  return await createNotification(prisma, {
    userId: assigneeId,
    type: 'assignment',
    title: `Bulk Assignment: ${ticketCount} Ticket(s)`,
    message: message,
    link: `/${assigneeType === 'admin' ? 'admin' : 'agent'}/tickets`,
    metadata: {
      ticketNumbers,
      ticketCount,
      reason,
      assignedBy,
      assigneeType
    },
    sendEmail: shouldSendEmail && assigneeEmail,
    emailSubject: `Bulk Assignment: ${ticketCount} Ticket(s) Assigned`,
    emailHtml,
    triggerType: 'ticketAssigned'
  });
}

/**
 * Create notification for ticket status change
 */
export async function notifyStatusChange(prisma, {
  ticketId,
  ticketSubject,
  oldStatus,
  newStatus,
  changedBy = 'admin',
  userId = null, // Notify specific user, or null for all admins
  sendEmail: shouldSendEmail = true
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const ticketLink = `${baseUrl}/admin/tickets/${ticketId}`;
  
  const emailHtml = await ticketStatusChangeTemplate({
    ticketId,
    ticketSubject: ticketSubject || 'No subject',
    oldStatus,
    newStatus,
    changedBy,
    ticketLink
  });

  // Determine trigger type based on status
  let triggerType = 'ticketUpdated';
  if (newStatus === 'resolved') {
    triggerType = 'ticketResolved';
  } else if (newStatus === 'closed') {
    triggerType = 'ticketClosed';
  }

  return await createNotification(prisma, {
    userId,
    type: 'status_change',
    title: 'Ticket Status Changed',
    message: `Ticket "${ticketSubject || ticketId}" status changed from ${oldStatus} to ${newStatus}`,
    link: `/admin/tickets/${ticketId}`,
    metadata: {
      ticketId,
      oldStatus,
      newStatus,
      changedBy
    },
    sendEmail: shouldSendEmail,
    emailSubject: `Ticket Status Updated: ${ticketId}`,
    emailHtml,
    triggerType
  });
}

/**
 * Create notification for SLA risk
 */
export async function notifySLARisk(prisma, {
  ticketId,
  ticketSubject,
  slaType, // 'first_response', 'resolution', etc.
  timeRemaining, // in seconds
  threshold, // threshold in seconds
  userId = null, // Notify all admins if null
  sendEmail: shouldSendEmail = true
}) {
  const hoursRemaining = Math.floor(timeRemaining / 3600);
  const minutesRemaining = Math.floor((timeRemaining % 3600) / 60);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const ticketLink = `${baseUrl}/admin/tickets/${ticketId}`;
  
  const emailHtml = await slaRiskTemplate({
    ticketId,
    ticketSubject: ticketSubject || 'No subject',
    slaType,
    timeRemaining,
    threshold,
    ticketLink
  });

  return await createNotification(prisma, {
    userId,
    type: 'sla_risk',
    title: 'SLA Risk Alert',
    message: `Ticket "${ticketSubject || ticketId}" is at risk of breaching ${slaType} SLA. Time remaining: ${hoursRemaining}h ${minutesRemaining}m`,
    link: `/admin/tickets/${ticketId}`,
    metadata: {
      ticketId,
      slaType,
      timeRemaining,
      threshold
    },
    sendEmail: shouldSendEmail,
    emailSubject: `⚠️ SLA Risk Alert: ${ticketId}`,
    emailHtml,
    triggerType: 'slaRisk'
  });
}

/**
 * Create notification for mention in comments
 */
export async function notifyMention(prisma, {
  ticketId,
  ticketSubject,
  mentionedUserId,
  mentionedUserName,
  mentionedBy,
  commentId,
  commentPreview,
  commentContent,
  sendEmail: shouldSendEmail = true
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const ticketLink = `${baseUrl}/admin/tickets/${ticketId}#comment-${commentId}`;
  
  const emailHtml = await mentionTemplate({
    ticketId,
    ticketSubject: ticketSubject || 'No subject',
    mentionedBy,
    commentContent: commentContent || commentPreview || '',
    ticketLink
  });

  return await createNotification(prisma, {
    userId: mentionedUserId,
    type: 'mention',
    title: `You were mentioned in a comment`,
    message: `${mentionedBy} mentioned you in a comment on ticket "${ticketSubject || ticketId}": ${commentPreview?.slice(0, 100) || ''}`,
    link: `/admin/tickets/${ticketId}#comment-${commentId}`,
    metadata: {
      ticketId,
      mentionedUserId,
      mentionedBy,
      commentId
    },
    sendEmail: shouldSendEmail,
    emailSubject: `You were mentioned: ${ticketId}`,
    emailHtml,
    triggerType: 'mentionReceived'
  });
}

/**
 * Send email notification to customer when agent/admin sends a message
 * Only sent if customer is not actively viewing the ticket
 */
export async function notifyCustomerMessage(prisma, {
  ticketId,
  ticketSubject,
  customerEmail,
  customerName,
  messageContent,
  senderName,
  ticketLink,
  sendEmail: shouldSendEmail = true
}) {
  // Check notification settings
  const notificationSettings = await getNotificationSettings();
  
  // If notifications are disabled, return early
  if (!notificationSettings.notificationEnabled) {
    console.log('Notifications are disabled. Skipping customer message notification.');
    return null;
  }
  
  // Check if messageReceived trigger is enabled
  if (notificationSettings.triggers.messageReceived === false) {
    console.log('Message received notifications are disabled. Skipping customer message notification.');
    return null;
  }
  
  if (!customerEmail) {
    console.warn('Cannot send customer message notification: no email address');
    return null;
  }

  const emailHtml = await customerMessageTemplate({
    ticketId,
    ticketSubject: ticketSubject || 'No subject',
    customerName: customerName || 'Customer',
    messageContent: messageContent || '',
    senderName: senderName || 'Support Agent',
    ticketLink
  });

  try {
    if (shouldSendEmail) {
      await sendEmail({
        to: customerEmail,
        subject: `New message on ticket ${ticketId}`,
        html: emailHtml
      });
    }

    return {
      success: true,
      emailSent: shouldSendEmail,
      customerEmail
    };
  } catch (error) {
    console.error('Error sending customer message email:', error);
    return {
      success: false,
      error: error.message,
      emailSent: false
    };
  }
}

/**
 * Create notification for ticket creation (to admins)
 */
export async function notifyTicketCreated(prisma, {
  ticketId,
  ticketSubject,
  customerName,
  priority = 'low',
  ticketLink,
  sendEmail: shouldSendEmail = true
}) {
  const emailHtml = await ticketCreatedTemplate({
    ticketId,
    ticketSubject: ticketSubject || 'No subject',
    customerName: customerName || 'Customer',
    priority,
    ticketLink
  });

  return await createNotification(prisma, {
    userId: null, // Notify all admins
    type: 'ticket_created',
    title: 'New Ticket Created',
    message: `New ticket "${ticketSubject || ticketId}" created by ${customerName || 'Customer'}`,
    link: `/admin/tickets/${ticketId}`,
    metadata: {
      ticketId,
      customerName,
      priority
    },
    sendEmail: shouldSendEmail,
    emailSubject: `New Ticket Created: ${ticketId}`,
    emailHtml,
    triggerType: 'ticketCreated'
  });
}

/**
 * Send email notification to customer when ticket is created
 */
export async function notifyTicketCreatedCustomer(prisma, {
  ticketId,
  ticketSubject,
  customerEmail,
  customerName,
  priority = 'low',
  ticketLink,
  sendEmail: shouldSendEmail = true
}) {
  if (!customerEmail) {
    console.warn('Cannot send ticket created notification: no customer email address');
    return null;
  }

  // Calculate expected response time based on priority
  const expectedResponseTime = {
    urgent: '1 hour',
    high: '2 hours',
    medium: '4 hours',
    low: '8 hours'
  }[priority] || '4 hours';

  const emailHtml = await ticketCreatedCustomerTemplate({
    ticketId,
    ticketSubject: ticketSubject || 'No subject',
    customerName: customerName || 'Customer',
    priority,
    ticketLink,
    expectedResponseTime
  });

  try {
    if (shouldSendEmail) {
      await sendEmail({
        to: customerEmail,
        subject: `Ticket Created: ${ticketId}`,
        html: emailHtml
      });
    }

    return {
      success: true,
      emailSent: shouldSendEmail,
      customerEmail
    };
  } catch (error) {
    console.error('Error sending ticket created email to customer:', error);
    return {
      success: false,
      error: error.message,
      emailSent: false
    };
  }
}

/**
 * Send email notification to customer when ticket is resolved/closed
 */
export async function notifyTicketResolvedCustomer(prisma, {
  ticketId,
  ticketSubject,
  customerEmail,
  customerName,
  status,
  resolvedBy,
  ticketLink,
  feedbackLink,
  sendEmail: shouldSendEmail = true
}) {
  if (!customerEmail) {
    console.warn('Cannot send ticket resolved notification: no customer email address');
    return null;
  }

  const emailHtml = await ticketResolvedCustomerTemplate({
    ticketId,
    ticketSubject: ticketSubject || 'No subject',
    customerName: customerName || 'Customer',
    status,
    resolvedBy: resolvedBy || 'Support Team',
    ticketLink,
    feedbackLink
  });

  try {
    if (shouldSendEmail) {
      await sendEmail({
        to: customerEmail,
        subject: `Ticket ${status === 'resolved' ? 'Resolved' : 'Closed'}: ${ticketId}`,
        html: emailHtml
      });
    }

    return {
      success: true,
      emailSent: shouldSendEmail,
      customerEmail
    };
  } catch (error) {
    console.error('Error sending ticket resolved email to customer:', error);
    return {
      success: false,
      error: error.message,
      emailSent: false
    };
  }
}

/**
 * Send email notification to customer when ticket is assigned
 */
export async function notifyTicketAssignedCustomer(prisma, {
  ticketId,
  ticketSubject,
  customerEmail,
  customerName,
  agentName,
  agentEmail,
  ticketLink,
  sendEmail: shouldSendEmail = true
}) {
  if (!customerEmail) {
    console.warn('Cannot send ticket assigned notification: no customer email address');
    return null;
  }

  const emailHtml = await ticketAssignedCustomerTemplate({
    ticketId,
    ticketSubject: ticketSubject || 'No subject',
    customerName: customerName || 'Customer',
    agentName: agentName || 'Support Agent',
    agentEmail,
    ticketLink
  });

  try {
    if (shouldSendEmail) {
      await sendEmail({
        to: customerEmail,
        subject: `Ticket Assigned: ${ticketId}`,
        html: emailHtml
      });
    }

    return {
      success: true,
      emailSent: shouldSendEmail,
      customerEmail
    };
  } catch (error) {
    console.error('Error sending ticket assigned email to customer:', error);
    return {
      success: false,
      error: error.message,
      emailSent: false
    };
  }
}

/**
 * Send email notification to customer when priority changes
 */
export async function notifyPriorityChangeCustomer(prisma, {
  ticketId,
  ticketSubject,
  customerEmail,
  customerName,
  oldPriority,
  newPriority,
  ticketLink,
  sendEmail: shouldSendEmail = true
}) {
  if (!customerEmail) {
    console.warn('Cannot send priority change notification: no customer email address');
    return null;
  }

  // Only send if priority changes to high/urgent or from high/urgent
  const shouldNotify = ['urgent', 'high'].includes(newPriority) || ['urgent', 'high'].includes(oldPriority);
  
  if (!shouldNotify) {
    return null; // Don't notify for low/medium changes
  }

  const emailHtml = await priorityChangeCustomerTemplate({
    ticketId,
    ticketSubject: ticketSubject || 'No subject',
    customerName: customerName || 'Customer',
    oldPriority,
    newPriority,
    ticketLink
  });

  try {
    if (shouldSendEmail) {
      await sendEmail({
        to: customerEmail,
        subject: `Priority Updated: ${ticketId}`,
        html: emailHtml
      });
    }

    return {
      success: true,
      emailSent: shouldSendEmail,
      customerEmail
    };
  } catch (error) {
    console.error('Error sending priority change email to customer:', error);
    return {
      success: false,
      error: error.message,
      emailSent: false
    };
  }
}

/**
 * Send email notification to customer when first response is received
 */
export async function notifyFirstResponseCustomer(prisma, {
  ticketId,
  ticketSubject,
  customerEmail,
  customerName,
  agentName,
  messageContent,
  ticketLink,
  sendEmail: shouldSendEmail = true
}) {
  if (!customerEmail) {
    console.warn('Cannot send first response notification: no customer email address');
    return null;
  }

  const emailHtml = await firstResponseCustomerTemplate({
    ticketId,
    ticketSubject: ticketSubject || 'No subject',
    customerName: customerName || 'Customer',
    agentName: agentName || 'Support Agent',
    messageContent: messageContent || '',
    ticketLink
  });

  try {
    if (shouldSendEmail) {
      await sendEmail({
        to: customerEmail,
        subject: `First Response: ${ticketId}`,
        html: emailHtml
      });
    }

    return {
      success: true,
      emailSent: shouldSendEmail,
      customerEmail
    };
  } catch (error) {
    console.error('Error sending first response email to customer:', error);
    return {
      success: false,
      error: error.message,
      emailSent: false
    };
  }
}

/**
 * Send email notification to agent when customer sends a message
 * Only sent if agent is not actively viewing the ticket
 */
export async function notifyCustomerMessageAgent(prisma, {
  ticketId,
  ticketSubject,
  agentEmail,
  agentName,
  customerName,
  customerEmail,
  messageContent,
  ticketLink,
  sendEmail: shouldSendEmail = true
}) {
  if (!agentEmail) {
    console.warn('Cannot send customer message notification: no agent email address');
    return null;
  }

  const emailHtml = await customerMessageAgentTemplate({
    ticketId,
    ticketSubject: ticketSubject || 'No subject',
    customerName: customerName || 'Customer',
    customerEmail,
    messageContent: messageContent || '',
    ticketLink
  });

  try {
    if (shouldSendEmail) {
      await sendEmail({
        to: agentEmail,
        subject: `New Customer Message: ${ticketId}`,
        html: emailHtml
      });
    }

    return {
      success: true,
      emailSent: shouldSendEmail,
      agentEmail
    };
  } catch (error) {
    console.error('Error sending customer message email to agent:', error);
    return {
      success: false,
      error: error.message,
      emailSent: false
    };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(prisma, notificationId) {
  try {
    return await prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return null;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(prisma, userId = null) {
  try {
    return await prisma.notification.updateMany({
      where: {
        userId: userId || null,
        read: false
      },
      data: {
        read: true,
        readAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return null;
  }
}

