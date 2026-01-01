// Widget API - Accept/Reject Rescheduled Callback
import prisma from '@/lib/prisma';
import { sendEmail } from '../../../../../lib/email/service';

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
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  try {
    const { id } = req.query;
    const { action, token } = req.body;

    if (!action || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be "accept" or "reject"' });
    }

    const callback = await prisma.scheduledCallback.findUnique({
      where: { id }
    });

    if (!callback) {
      return res.status(404).json({ success: false, message: 'Callback not found' });
    }

    if (callback.rescheduleStatus !== 'pending_acceptance') {
      return res.status(400).json({ success: false, message: 'This callback is not pending reschedule acceptance' });
    }

    let updatedCallback;
    let emailHtml;
    let emailSubject;

    if (action === 'accept') {
      // Update scheduled time to rescheduled time and mark as accepted
      updatedCallback = await prisma.scheduledCallback.update({
        where: { id },
        data: {
          scheduledTime: callback.rescheduledTime,
          rescheduledTime: null,
          rescheduleStatus: 'accepted',
          status: callback.agentId ? 'assigned' : 'approved'
        }
      });

      emailSubject = 'Callback Reschedule Accepted';
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #10b981, #059669); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
            .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">Callback Reschedule Accepted</h2>
            </div>
            <div class="content">
              <p>Hello ${callback.customerName},</p>
              <p>Thank you for accepting the rescheduled time. Your callback is confirmed for:</p>
              
              <div class="info-box">
                <strong>Confirmed Time:</strong><br>
                ${new Date(callback.rescheduledTime).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} at ${new Date(callback.rescheduledTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              
              <p>We look forward to speaking with you!</p>
            </div>
            <div class="footer">
              <p>This is an automated notification from WZATCO Support System</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      // Reject - keep original time, mark as rejected
      updatedCallback = await prisma.scheduledCallback.update({
        where: { id },
        data: {
          rescheduledTime: null,
          rescheduleStatus: 'rejected',
          status: callback.agentId ? 'assigned' : 'approved'
        }
      });

      emailSubject = 'Callback Reschedule Rejected';
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #ef4444, #dc2626); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
            .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ef4444; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">Callback Reschedule Rejected</h2>
            </div>
            <div class="content">
              <p>Hello ${callback.customerName},</p>
              <p>We understand the rescheduled time doesn't work for you. Your original callback time remains:</p>
              
              <div class="info-box">
                <strong>Original Time:</strong><br>
                ${new Date(callback.scheduledTime).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} at ${new Date(callback.scheduledTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              
              <p>If you'd like to suggest a different time, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>This is an automated notification from WZATCO Support System</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // Send confirmation email
    try {
      await sendEmail({
        to: callback.customerEmail,
        subject: emailSubject,
        html: emailHtml
      });
    } catch (emailError) {
      console.error('Error sending reschedule response email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json({
      success: true,
      message: action === 'accept' ? 'Callback reschedule accepted successfully' : 'Callback reschedule rejected. Original time maintained.',
      callback: updatedCallback
    });
  } catch (error) {
    console.error('Error processing reschedule response:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  } finally {
    await prisma.$disconnect();
  }
}

