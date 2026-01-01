/**
 * Modern, professional email templates for various notification types
 */

import { getBasicSettings } from '../settings';

/**
 * Base email template wrapper with modern design
 */
async function baseTemplate(content, title = null, icon = null, appTitle = null, appEmail = null) {
  // Fetch settings if not provided
  if (!appTitle || !appEmail) {
    const settings = await getBasicSettings();
    appTitle = appTitle || settings.appTitle || 'HelpDesk Pro';
    appEmail = appEmail || settings.appEmail || 'support@helpdesk.com';
  }
  
  const emailTitle = title || appTitle;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background-color: #f1f5f9;
      margin: 0;
      padding: 20px;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .email-container {
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
      padding: 40px 32px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: pulse 20s infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }
    .header-content {
      position: relative;
      z-index: 1;
    }
    .logo {
      width: 120px;
      height: 120px;
      margin: 0 auto 20px;
      display: block;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      padding: 16px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      filter: brightness(0) invert(1);
    }
    .header h1 {
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.3px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .content {
      padding: 40px 32px;
    }
    .greeting {
      font-size: 16px;
      color: #475569;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .main-content {
      margin-bottom: 32px;
    }
    .info-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .info-row {
      display: flex;
      align-items: flex-start;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      min-width: 120px;
      margin-right: 16px;
    }
    .info-value {
      font-size: 15px;
      font-weight: 500;
      color: #1e293b;
      flex: 1;
    }
    .ticket-id {
      font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
      font-weight: 700;
      color: #6366f1;
      background: #eef2ff;
      padding: 4px 10px;
      border-radius: 6px;
      display: inline-block;
      font-size: 14px;
    }
    .badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-success {
      background: #d1fae5;
      color: #065f46;
    }
    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }
    .badge-danger {
      background: #fee2e2;
      color: #991b1b;
    }
    .badge-info {
      background: #dbeafe;
      color: #1e40af;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 15px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
      transition: all 0.3s ease;
      margin: 24px 0;
    }
    .button:hover {
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
      transform: translateY(-2px);
    }
    .button-danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }
    .button-danger:hover {
      box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
    }
    .comment-box {
      background: #ffffff;
      border: 2px solid #e2e8f0;
      border-left: 4px solid #6366f1;
      border-radius: 10px;
      padding: 20px;
      margin: 24px 0;
      font-style: italic;
      color: #475569;
      line-height: 1.7;
    }
    .alert-box {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border: 2px solid #fecaca;
      border-left: 4px solid #ef4444;
      border-radius: 10px;
      padding: 20px;
      margin: 24px 0;
    }
    .alert-box h3 {
      color: #991b1b;
      font-size: 18px;
      font-weight: 700;
      margin: 0 0 12px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .alert-box p {
      color: #7f1d1d;
      margin: 0;
      line-height: 1.6;
    }
    .footer {
      background: #f8fafc;
      padding: 32px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      font-size: 13px;
      color: #64748b;
      margin: 8px 0;
      line-height: 1.6;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
      font-weight: 500;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
      margin: 32px 0;
    }
    @media only screen and (max-width: 600px) {
      body {
        padding: 10px;
      }
      .header {
        padding: 32px 24px;
      }
      .content {
        padding: 32px 24px;
      }
      .info-row {
        flex-direction: column;
      }
      .info-label {
        min-width: auto;
        margin-bottom: 4px;
      }
      .button {
        display: block;
        width: 100%;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="header">
        <div class="header-content">
          <div class="logo">
            <img src="https://wzatco.com/wp-content/uploads/2025/11/Layer-2-1-scaled.png" alt="Wzatco Support Desk" />
          </div>
          <h1>${emailTitle}</h1>
        </div>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p><strong>${appTitle}</strong></p>
        <p>This is an automated notification email.</p>
        <p>If you have any questions, please contact <a href="mailto:${appEmail}">${appEmail}</a></p>
        <div class="divider"></div>
        <p style="font-size: 12px; color: #94a3b8;">© ${new Date().getFullYear()} ${appTitle}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Ticket Assignment Email Template - Modern Design
 */
export async function ticketAssignmentTemplate({ ticketId, ticketSubject, agentName, assignedBy, ticketLink }) {
  const content = `
    <div class="greeting">
      Hello <strong>${agentName}</strong>,
    </div>
    
    <div class="main-content">
      <p style="font-size: 16px; color: #1e293b; margin-bottom: 24px; line-height: 1.7;">
        You have been assigned to a new support ticket. Please review and respond as soon as possible.
      </p>
      
      <div class="info-card">
        <div class="info-row">
          <div class="info-label">Ticket ID</div>
          <div class="info-value">
            <span class="ticket-id">${ticketId}</span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Subject</div>
          <div class="info-value" style="font-weight: 600; color: #1e293b;">
            ${ticketSubject || 'No subject'}
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Assigned By</div>
          <div class="info-value">
            ${assignedBy}
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Status</div>
          <div class="info-value">
            <span class="badge badge-info">New Assignment</span>
          </div>
        </div>
      </div>
    </div>
    
    ${ticketLink ? `
      <div style="text-align: center;">
        <a href="${ticketLink}" class="button">View & Respond to Ticket</a>
      </div>
    ` : ''}
    
    <p style="font-size: 14px; color: #64748b; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
      <strong>Next Steps:</strong> Review the ticket details, understand the customer's issue, and provide a timely response to ensure customer satisfaction.
    </p>
  `;
  return await baseTemplate(content, 'New Ticket Assigned');
}

/**
 * Ticket Status Change Email Template - Modern Design
 */
export async function ticketStatusChangeTemplate({ ticketId, ticketSubject, oldStatus, newStatus, changedBy, ticketLink }) {
  const statusColors = {
    open: { bg: '#dbeafe', color: '#1e40af', label: 'Open' },
    pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
    resolved: { bg: '#d1fae5', color: '#065f46', label: 'Resolved' },
    closed: { bg: '#e5e7eb', color: '#374151', label: 'Closed' }
  };
  
  const oldStatusStyle = statusColors[oldStatus] || { bg: '#f1f5f9', color: '#475569', label: oldStatus };
  const newStatusStyle = statusColors[newStatus] || { bg: '#f1f5f9', color: '#475569', label: newStatus };
  
  const content = `
    <div class="greeting">
      Ticket status has been updated
    </div>
    
    <div class="main-content">
      <p style="font-size: 16px; color: #1e293b; margin-bottom: 24px; line-height: 1.7;">
        The status of ticket <span class="ticket-id">${ticketId}</span> has been changed.
      </p>
      
      <div class="info-card">
        <div class="info-row">
          <div class="info-label">Ticket ID</div>
          <div class="info-value">
            <span class="ticket-id">${ticketId}</span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Subject</div>
          <div class="info-value" style="font-weight: 600; color: #1e293b;">
            ${ticketSubject || 'No subject'}
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Status Change</div>
          <div class="info-value">
            <span class="badge" style="background: ${oldStatusStyle.bg}; color: ${oldStatusStyle.color}; margin-right: 8px;">
              ${oldStatusStyle.label}
            </span>
            <span style="color: #94a3b8; margin: 0 8px;">→</span>
            <span class="badge" style="background: ${newStatusStyle.bg}; color: ${newStatusStyle.color};">
              ${newStatusStyle.label}
            </span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Changed By</div>
          <div class="info-value">
            ${changedBy}
          </div>
        </div>
      </div>
    </div>
    
    ${ticketLink ? `
      <div style="text-align: center;">
        <a href="${ticketLink}" class="button">View Ticket Details</a>
      </div>
    ` : ''}
  `;
  return await baseTemplate(content, 'Ticket Status Updated');
}

/**
 * Mention in Comment Email Template - Modern Design
 */
export async function mentionTemplate({ ticketId, ticketSubject, mentionedBy, commentContent, ticketLink }) {
  const content = `
    <div class="greeting">
      You were mentioned in a comment
    </div>
    
    <div class="main-content">
      <p style="font-size: 16px; color: #1e293b; margin-bottom: 24px; line-height: 1.7;">
        <strong style="color: #6366f1;">${mentionedBy}</strong> mentioned you in a comment on ticket <span class="ticket-id">${ticketId}</span>.
      </p>
      
      <div class="info-card">
        <div class="info-row">
          <div class="info-label">Ticket ID</div>
          <div class="info-value">
            <span class="ticket-id">${ticketId}</span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Subject</div>
          <div class="info-value" style="font-weight: 600; color: #1e293b;">
            ${ticketSubject || 'No subject'}
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Mentioned By</div>
          <div class="info-value">
            ${mentionedBy}
          </div>
        </div>
      </div>
      
      <div class="comment-box">
        <p style="margin: 0; white-space: pre-wrap; line-height: 1.8;">${commentContent}</p>
      </div>
    </div>
    
    ${ticketLink ? `
      <div style="text-align: center;">
        <a href="${ticketLink}" class="button">View Comment & Respond</a>
      </div>
    ` : ''}
    
    <p style="font-size: 14px; color: #64748b; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
      <strong>Note:</strong> This notification was sent because you were mentioned using @mention in an internal comment.
    </p>
  `;
  return await baseTemplate(content, 'You Were Mentioned');
}

/**
 * SLA Risk Alert Email Template - Modern Design
 */
export async function slaRiskTemplate({ ticketId, ticketSubject, slaType, timeRemaining, threshold, ticketLink }) {
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const timeString = hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}` : `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  
  const slaTypeLabel = slaType === 'first_response' ? 'First Response Time' : 'Resolution Time';
  const urgencyLevel = timeRemaining < 3600 ? 'Critical' : timeRemaining < 7200 ? 'High' : 'Medium';
  
  const content = `
    <div class="alert-box">
      <h3>
        ⚠️ SLA Risk Alert
      </h3>
      <p>
        This ticket is approaching its SLA deadline and requires immediate attention.
      </p>
    </div>
    
    <div class="main-content">
      <p style="font-size: 16px; color: #1e293b; margin-bottom: 24px; line-height: 1.7;">
        Ticket <span class="ticket-id">${ticketId}</span> is at risk of breaching its <strong>${slaTypeLabel}</strong> SLA.
      </p>
      
      <div class="info-card" style="border-left-color: #ef4444;">
        <div class="info-row">
          <div class="info-label">Ticket ID</div>
          <div class="info-value">
            <span class="ticket-id">${ticketId}</span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Subject</div>
          <div class="info-value" style="font-weight: 600; color: #1e293b;">
            ${ticketSubject || 'No subject'}
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">SLA Type</div>
          <div class="info-value">
            <span class="badge badge-warning">${slaTypeLabel}</span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Time Remaining</div>
          <div class="info-value">
            <span style="font-size: 18px; font-weight: 700; color: #dc2626;">
              ${timeString}
            </span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Urgency Level</div>
          <div class="info-value">
            <span class="badge badge-danger">${urgencyLevel} Priority</span>
          </div>
        </div>
      </div>
    </div>
    
    ${ticketLink ? `
      <div style="text-align: center;">
        <a href="${ticketLink}" class="button button-danger">Take Action Now</a>
      </div>
    ` : ''}
    
    <p style="font-size: 14px; color: #dc2626; margin-top: 32px; padding: 16px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
      <strong>⚠️ Action Required:</strong> Please review this ticket immediately and take necessary steps to ensure the SLA is met. Delayed response may result in SLA breach.
    </p>
  `;
  return await baseTemplate(content, 'SLA Risk Alert');
}

/**
 * Ticket Created Email Template - Modern Design
 */
export async function ticketCreatedTemplate({ ticketId, ticketSubject, customerName, priority, ticketLink }) {
  const priorityConfig = {
    low: { bg: '#d1fae5', color: '#065f46', label: 'Low', icon: '📋' },
    medium: { bg: '#fef3c7', color: '#92400e', label: 'Medium', icon: '📌' },
    high: { bg: '#fed7aa', color: '#9a3412', label: 'High', icon: '⚠️' },
    urgent: { bg: '#fee2e2', color: '#991b1b', label: 'Urgent', icon: '🚨' }
  };
  const priorityStyle = priorityConfig[priority] || priorityConfig.medium;
  
  const content = `
    <div class="greeting">
      New ticket created
    </div>
    
    <div class="main-content">
      <p style="font-size: 16px; color: #1e293b; margin-bottom: 24px; line-height: 1.7;">
        A new support ticket has been created and requires attention.
      </p>
      
      <div class="info-card">
        <div class="info-row">
          <div class="info-label">Ticket ID</div>
          <div class="info-value">
            <span class="ticket-id">${ticketId}</span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Subject</div>
          <div class="info-value" style="font-weight: 600; color: #1e293b;">
            ${ticketSubject || 'No subject'}
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Customer</div>
          <div class="info-value">
            ${customerName || 'Unknown'}
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Priority</div>
          <div class="info-value">
            <span class="badge" style="background: ${priorityStyle.bg}; color: ${priorityStyle.color};">
              ${priorityStyle.icon} ${priorityStyle.label}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    ${ticketLink ? `
      <div style="text-align: center;">
        <a href="${ticketLink}" class="button">View New Ticket</a>
      </div>
    ` : ''}
    
    <p style="font-size: 14px; color: #64748b; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
      <strong>Note:</strong> This ticket is waiting for assignment. Please review and assign it to an appropriate agent.
    </p>
  `;
  return await baseTemplate(content, 'New Ticket Created');
}

/**
 * Customer Message Notification Email Template - Modern Design
 * Sent when agent/admin sends a message and customer is not active
 */
export async function customerMessageTemplate({ ticketId, ticketSubject, customerName, messageContent, senderName, ticketLink }) {
  const content = `
    <div class="greeting">
      New message on your ticket
    </div>
    
    <div class="main-content">
      <p style="font-size: 16px; color: #1e293b; margin-bottom: 24px; line-height: 1.7;">
        You have received a new message from <strong>${senderName}</strong> on your support ticket.
      </p>
      
      <div class="info-card">
        <div class="info-row">
          <div class="info-label">Ticket ID</div>
          <div class="info-value">
            <span class="ticket-id">${ticketId}</span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Subject</div>
          <div class="info-value" style="font-weight: 600; color: #1e293b;">
            ${ticketSubject || 'No subject'}
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">From</div>
          <div class="info-value">
            ${senderName}
          </div>
        </div>
      </div>

      <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <p style="font-size: 14px; color: #64748b; margin-bottom: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
          Message:
        </p>
        <p style="font-size: 16px; color: #1e293b; line-height: 1.7; white-space: pre-wrap; margin: 0;">
          ${messageContent}
        </p>
      </div>
    </div>
    
    ${ticketLink ? `
      <div style="text-align: center;">
        <a href="${ticketLink}" class="button">View Ticket & Reply</a>
      </div>
    ` : ''}
    
    <p style="font-size: 14px; color: #64748b; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
      <strong>Note:</strong> You received this email because you were not actively viewing the ticket when this message was sent. You can reply directly to this email or visit the ticket link above.
    </p>
  `;
  return await baseTemplate(content, 'New Message on Your Ticket');
}

/**
 * Ticket Created Confirmation Email Template - For Customers
 */
export async function ticketCreatedCustomerTemplate({ ticketId, ticketSubject, customerName, priority, ticketLink, expectedResponseTime }) {
  const priorityConfig = {
    low: { bg: '#d1fae5', color: '#065f46', label: 'Low', icon: '📋' },
    medium: { bg: '#fef3c7', color: '#92400e', label: 'Medium', icon: '📌' },
    high: { bg: '#fed7aa', color: '#9a3412', label: 'High', icon: '⚠️' },
    urgent: { bg: '#fee2e2', color: '#991b1b', label: 'Urgent', icon: '🚨' }
  };
  const priorityStyle = priorityConfig[priority] || priorityConfig.medium;
  
  const content = `
    <div class="greeting">
      Your ticket has been created
    </div>
    
    <div class="main-content">
      <p style="font-size: 16px; color: #1e293b; margin-bottom: 24px; line-height: 1.7;">
        Thank you for contacting us! We've received your support request and created ticket <span class="ticket-id">${ticketId}</span>.
      </p>
      
      <div class="info-card">
        <div class="info-row">
          <div class="info-label">Ticket ID</div>
          <div class="info-value">
            <span class="ticket-id">${ticketId}</span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Subject</div>
          <div class="info-value" style="font-weight: 600; color: #1e293b;">
            ${ticketSubject || 'No subject'}
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Priority</div>
          <div class="info-value">
            <span class="badge" style="background: ${priorityStyle.bg}; color: ${priorityStyle.color};">
              ${priorityStyle.icon} ${priorityStyle.label}
            </span>
          </div>
        </div>
        ${expectedResponseTime ? `
        <div class="info-row">
          <div class="info-label">Expected Response</div>
          <div class="info-value">
            Within ${expectedResponseTime}
          </div>
        </div>
        ` : ''}
      </div>
    </div>
    
    ${ticketLink ? `
      <div style="text-align: center;">
        <a href="${ticketLink}" class="button">View Your Ticket</a>
      </div>
    ` : ''}
    
    <p style="font-size: 14px; color: #64748b; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
      <strong>What's next?</strong> Our support team will review your ticket and respond as soon as possible. You'll receive an email notification when we respond.
    </p>
  `;
  return await baseTemplate(content, 'Ticket Created');
}

/**
 * Ticket Resolved/Closed Email Template - For Customers
 */
export async function ticketResolvedCustomerTemplate({ ticketId, ticketSubject, customerName, status, resolvedBy, ticketLink, feedbackLink }) {
  const statusLabel = status === 'resolved' ? 'Resolved' : 'Closed';
  const statusColor = status === 'resolved' ? '#10b981' : '#6b7280';
  
  const content = `
    <div class="greeting">
      Your ticket has been ${statusLabel.toLowerCase()}
    </div>
    
    <div class="main-content">
      <p style="font-size: 16px; color: #1e293b; margin-bottom: 24px; line-height: 1.7;">
        Your support ticket <span class="ticket-id">${ticketId}</span> has been marked as <strong style="color: ${statusColor};">${statusLabel}</strong>.
      </p>
      
      <div class="info-card">
        <div class="info-row">
          <div class="info-label">Ticket ID</div>
          <div class="info-value">
            <span class="ticket-id">${ticketId}</span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Subject</div>
          <div class="info-value" style="font-weight: 600; color: #1e293b;">
            ${ticketSubject || 'No subject'}
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Status</div>
          <div class="info-value">
            <span class="badge" style="background: ${status === 'resolved' ? '#d1fae5' : '#f3f4f6'}; color: ${statusColor};">
              ${statusLabel}
            </span>
          </div>
        </div>
        ${resolvedBy ? `
        <div class="info-row">
          <div class="info-label">Resolved By</div>
          <div class="info-value">
            ${resolvedBy}
          </div>
        </div>
        ` : ''}
      </div>
    </div>
    
    ${ticketLink ? `
      <div style="text-align: center;">
        <a href="${ticketLink}" class="button">View Ticket</a>
      </div>
    ` : ''}
    
    ${feedbackLink ? `
      <p style="font-size: 14px; color: #64748b; margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #6366f1;">
        <strong>We'd love your feedback!</strong> Please take a moment to rate your experience with our support team.
        <br><br>
        <a href="${feedbackLink}" style="color: #6366f1; text-decoration: none; font-weight: 600;">Share Your Feedback →</a>
      </p>
    ` : ''}
    
    <p style="font-size: 14px; color: #64748b; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
      If you have any further questions or concerns, please don't hesitate to create a new ticket.
    </p>
  `;
  return await baseTemplate(content, `Ticket ${statusLabel}`);
}

/**
 * Ticket Assigned Email Template - For Customers
 */
export async function ticketAssignedCustomerTemplate({ ticketId, ticketSubject, customerName, agentName, agentEmail, ticketLink }) {
  const content = `
    <div class="greeting">
      Your ticket has been assigned
    </div>
    
    <div class="main-content">
      <p style="font-size: 16px; color: #1e293b; margin-bottom: 24px; line-height: 1.7;">
        Great news! Your support ticket has been assigned to <strong>${agentName}</strong>, who will be handling your request.
      </p>
      
      <div class="info-card">
        <div class="info-row">
          <div class="info-label">Ticket ID</div>
          <div class="info-value">
            <span class="ticket-id">${ticketId}</span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Subject</div>
          <div class="info-value" style="font-weight: 600; color: #1e293b;">
            ${ticketSubject || 'No subject'}
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Assigned To</div>
          <div class="info-value">
            <strong>${agentName}</strong>
            ${agentEmail ? `<br><span style="font-size: 14px; color: #64748b;">${agentEmail}</span>` : ''}
          </div>
        </div>
      </div>
    </div>
    
    ${ticketLink ? `
      <div style="text-align: center;">
        <a href="${ticketLink}" class="button">View Your Ticket</a>
      </div>
    ` : ''}
    
    <p style="font-size: 14px; color: #64748b; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
      Your assigned agent will review your ticket and respond as soon as possible. You'll receive an email notification when they reply.
    </p>
  `;
  return await baseTemplate(content, 'Ticket Assigned');
}

/**
 * Priority Change Email Template - For Customers
 */
export async function priorityChangeCustomerTemplate({ ticketId, ticketSubject, customerName, oldPriority, newPriority, ticketLink }) {
  const priorityConfig = {
    low: { bg: '#d1fae5', color: '#065f46', label: 'Low', icon: '📋' },
    medium: { bg: '#fef3c7', color: '#92400e', label: 'Medium', icon: '📌' },
    high: { bg: '#fed7aa', color: '#9a3412', label: 'High', icon: '⚠️' },
    urgent: { bg: '#fee2e2', color: '#991b1b', label: 'Urgent', icon: '🚨' }
  };
  const oldPriorityStyle = priorityConfig[oldPriority] || priorityConfig.medium;
  const newPriorityStyle = priorityConfig[newPriority] || priorityConfig.medium;
  const isEscalation = ['urgent', 'high'].includes(newPriority) && !['urgent', 'high'].includes(oldPriority);
  
  const content = `
    <div class="greeting">
      ${isEscalation ? '⚠️ Priority Escalated' : 'Priority Updated'}
    </div>
    
    <div class="main-content">
      <p style="font-size: 16px; color: #1e293b; margin-bottom: 24px; line-height: 1.7;">
        The priority of your support ticket <span class="ticket-id">${ticketId}</span> has been changed from <strong>${oldPriorityStyle.label}</strong> to <strong>${newPriorityStyle.label}</strong>.
      </p>
      
      ${isEscalation ? `
      <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <p style="font-size: 14px; color: #991b1b; margin: 0; font-weight: 600;">
          ⚠️ Your ticket has been escalated to ${newPriorityStyle.label} priority. Our team will prioritize your request.
        </p>
      </div>
      ` : ''}
      
      <div class="info-card">
        <div class="info-row">
          <div class="info-label">Ticket ID</div>
          <div class="info-value">
            <span class="ticket-id">${ticketId}</span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Subject</div>
          <div class="info-value" style="font-weight: 600; color: #1e293b;">
            ${ticketSubject || 'No subject'}
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Previous Priority</div>
          <div class="info-value">
            <span class="badge" style="background: ${oldPriorityStyle.bg}; color: ${oldPriorityStyle.color};">
              ${oldPriorityStyle.icon} ${oldPriorityStyle.label}
            </span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">New Priority</div>
          <div class="info-value">
            <span class="badge" style="background: ${newPriorityStyle.bg}; color: ${newPriorityStyle.color};">
              ${newPriorityStyle.icon} ${newPriorityStyle.label}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    ${ticketLink ? `
      <div style="text-align: center;">
        <a href="${ticketLink}" class="button">View Your Ticket</a>
      </div>
    ` : ''}
    
    <p style="font-size: 14px; color: #64748b; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
      ${isEscalation ? 'Our support team will prioritize your request and respond as soon as possible.' : 'This change may affect the expected response time for your ticket.'}
    </p>
  `;
  return await baseTemplate(content, 'Priority Updated');
}

/**
 * First Response Email Template - For Customers
 */
export async function firstResponseCustomerTemplate({ ticketId, ticketSubject, customerName, agentName, messageContent, ticketLink }) {
  const content = `
    <div class="greeting">
      You have a new response
    </div>
    
    <div class="main-content">
      <p style="font-size: 16px; color: #1e293b; margin-bottom: 24px; line-height: 1.7;">
        <strong>${agentName}</strong> has responded to your support ticket <span class="ticket-id">${ticketId}</span>.
      </p>
      
      <div class="info-card">
        <div class="info-row">
          <div class="info-label">Ticket ID</div>
          <div class="info-value">
            <span class="ticket-id">${ticketId}</span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Subject</div>
          <div class="info-value" style="font-weight: 600; color: #1e293b;">
            ${ticketSubject || 'No subject'}
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">From</div>
          <div class="info-value">
            ${agentName}
          </div>
        </div>
      </div>

      <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <p style="font-size: 14px; color: #64748b; margin-bottom: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
          Response:
        </p>
        <p style="font-size: 16px; color: #1e293b; line-height: 1.7; white-space: pre-wrap; margin: 0;">
          ${messageContent}
        </p>
      </div>
    </div>
    
    ${ticketLink ? `
      <div style="text-align: center;">
        <a href="${ticketLink}" class="button">Reply to Ticket</a>
      </div>
    ` : ''}
    
    <p style="font-size: 14px; color: #64748b; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
      <strong>Note:</strong> This is the first response to your ticket. You can reply directly to this email or visit the ticket link above to continue the conversation.
    </p>
  `;
  return await baseTemplate(content, 'First Response Received');
}

/**
 * Customer Message Email Template - For Agents
 * Sent when customer sends a message and agent is not active
 */
/**
 * Agent Welcome Email Template - Modern Design
 * Sent when a new agent account is created
 */
export async function agentWelcomeTemplate({ agentName, agentEmail, agentId, departmentName, roleName, loginLink, passwordSetupLink, adminName }) {
  const content = `
    <div class="greeting">
      Welcome to the team, <strong>${agentName}</strong>!
    </div>
    
    <div class="main-content">
      <p style="font-size: 16px; color: #1e293b; margin-bottom: 24px; line-height: 1.7;">
        Your agent account has been successfully created. You're now part of our support team and ready to help customers!
      </p>
      
      <div class="info-card">
        <div class="info-row">
          <div class="info-label">Agent ID</div>
          <div class="info-value">
            <span class="ticket-id">${agentId}</span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Email</div>
          <div class="info-value" style="font-weight: 600; color: #1e293b;">
            ${agentEmail}
          </div>
        </div>
        ${departmentName ? `
        <div class="info-row">
          <div class="info-label">Department</div>
          <div class="info-value">
            ${departmentName}
          </div>
        </div>
        ` : ''}
        ${roleName ? `
        <div class="info-row">
          <div class="info-label">Role</div>
          <div class="info-value">
            ${roleName}
          </div>
        </div>
        ` : ''}
        ${adminName ? `
        <div class="info-row">
          <div class="info-label">Created By</div>
          <div class="info-value">
            ${adminName}
          </div>
        </div>
        ` : ''}
      </div>
    </div>
    
    ${passwordSetupLink ? `
      <div style="text-align: center; margin: 32px 0;">
        <p style="font-size: 16px; color: #1e293b; margin-bottom: 16px; font-weight: 600;">
          🔐 Set Up Your Password
        </p>
        <p style="font-size: 14px; color: #64748b; margin-bottom: 24px; line-height: 1.6;">
          To get started, you need to set up your password. Click the button below to create your password and access the agent portal.
        </p>
        <a href="${passwordSetupLink}" class="button" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 14px 32px; font-size: 16px; font-weight: 600;">
          Set Up Password
        </a>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">
          This link will expire in 72 hours. If it expires, please contact your administrator.
        </p>
      </div>
    ` : ''}
    
    ${loginLink ? `
      <div style="text-align: center; ${passwordSetupLink ? 'margin-top: 24px;' : ''}">
        <a href="${loginLink}" class="button" style="${passwordSetupLink ? 'background: #f1f5f9; color: #475569;' : ''}">
          ${passwordSetupLink ? 'Already have a password? Login' : 'Access Agent Portal'}
        </a>
      </div>
    ` : ''}
    
    <p style="font-size: 14px; color: #64748b; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
      <strong>Next Steps:</strong> ${passwordSetupLink ? 'Set up your password using the link above, then ' : ''}You can log in to the agent portal to start managing support tickets. If you have any questions or need assistance, please contact your administrator.
    </p>
    
    <p style="font-size: 14px; color: #64748b; margin-top: 16px;">
      We're excited to have you on board and look forward to working with you!
    </p>
  `;
  return await baseTemplate(content, 'Welcome to the Team');
}

export async function customerMessageAgentTemplate({ ticketId, ticketSubject, customerName, customerEmail, messageContent, ticketLink }) {
  const content = `
    <div class="greeting">
      New customer message
    </div>
    
    <div class="main-content">
      <p style="font-size: 16px; color: #1e293b; margin-bottom: 24px; line-height: 1.7;">
        <strong>${customerName}</strong> has sent a new message on ticket <span class="ticket-id">${ticketId}</span>.
      </p>
      
      <div class="info-card">
        <div class="info-row">
          <div class="info-label">Ticket ID</div>
          <div class="info-value">
            <span class="ticket-id">${ticketId}</span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Subject</div>
          <div class="info-value" style="font-weight: 600; color: #1e293b;">
            ${ticketSubject || 'No subject'}
          </div>
        </div>
        <div class="info-row">
          <div class="info-label">Customer</div>
          <div class="info-value">
            ${customerName}
            ${customerEmail ? `<br><span style="font-size: 14px; color: #64748b;">${customerEmail}</span>` : ''}
          </div>
        </div>
      </div>

      <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <p style="font-size: 14px; color: #64748b; margin-bottom: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
          Customer Message:
        </p>
        <p style="font-size: 16px; color: #1e293b; line-height: 1.7; white-space: pre-wrap; margin: 0;">
          ${messageContent}
        </p>
      </div>
    </div>
    
    ${ticketLink ? `
      <div style="text-align: center;">
        <a href="${ticketLink}" class="button">View Ticket & Reply</a>
      </div>
    ` : ''}
    
    <p style="font-size: 14px; color: #64748b; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
      <strong>Note:</strong> You received this email because you were not actively viewing the ticket when this message was sent. Please respond promptly to maintain customer satisfaction.
    </p>
  `;
  return await baseTemplate(content, 'New Customer Message');
}