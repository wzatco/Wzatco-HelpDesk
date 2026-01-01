import { sendEmail } from '../../../lib/email/service';
import { verifyEmailConnection } from '../../../lib/email/service';
import { 
  ticketAssignmentTemplate, 
  ticketStatusChangeTemplate, 
  mentionTemplate, 
  slaRiskTemplate 
} from '../../../lib/email/templates';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { testType, recipientEmail } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ message: 'Recipient email is required' });
    }

    // First, verify email connection
    const connectionOk = await verifyEmailConnection();
    if (!connectionOk) {
      return res.status(500).json({ 
        message: 'Email connection verification failed. Please check your SMTP configuration.',
        connectionOk: false
      });
    }

    let emailSubject = '';
    let emailHtml = '';

    // Generate test email based on type
    switch (testType) {
      case 'assignment':
        emailSubject = 'Test: Ticket Assignment Notification';
        emailHtml = await ticketAssignmentTemplate({
          ticketId: 'TKT-2411-001',
          ticketSubject: 'Test Ticket - Email Notification',
          agentName: 'Test Agent',
          assignedBy: 'Admin',
          ticketLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/tickets/TKT-2411-001`
        });
        break;

      case 'status_change':
        emailSubject = 'Test: Ticket Status Change Notification';
        emailHtml = await ticketStatusChangeTemplate({
          ticketId: 'TKT-2411-001',
          ticketSubject: 'Test Ticket - Status Update',
          oldStatus: 'open',
          newStatus: 'resolved',
          changedBy: 'Admin',
          ticketLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/tickets/TKT-2411-001`
        });
        break;

      case 'mention':
        emailSubject = 'Test: Mention Notification';
        emailHtml = await mentionTemplate({
          ticketId: 'TKT-2411-001',
          ticketSubject: 'Test Ticket - Mention',
          mentionedBy: 'Admin',
          commentContent: 'This is a test mention notification. You were mentioned in a comment on this ticket.',
          ticketLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/tickets/TKT-2411-001#comment-test`
        });
        break;

      case 'sla_risk':
        emailSubject = 'Test: SLA Risk Alert';
        emailHtml = await slaRiskTemplate({
          ticketId: 'TKT-2411-001',
          ticketSubject: 'Test Ticket - SLA Risk',
          slaType: 'first_response',
          timeRemaining: 3600, // 1 hour
          threshold: 7200, // 2 hours
          ticketLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/tickets/TKT-2411-001`
        });
        break;

      default:
        return res.status(400).json({ message: 'Invalid test type. Use: assignment, status_change, mention, or sla_risk' });
    }

    // Send test email
    const result = await sendEmail({
      to: recipientEmail,
      subject: emailSubject,
      html: emailHtml
    });

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId,
        connectionOk: true
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message || 'Failed to send test email',
        error: result.error,
        connectionOk: true
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

