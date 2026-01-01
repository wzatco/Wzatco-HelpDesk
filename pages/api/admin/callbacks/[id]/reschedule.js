// Admin API - Reschedule Callback
import { PrismaClient } from '@prisma/client';
import { sendEmail } from '../../../../../lib/email/service';
import crypto from 'crypto';

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
    const { date, time } = req.body;

    if (!date || !time) {
      return res.status(400).json({ success: false, message: 'Date and time are required' });
    }

    // Convert time from 12-hour format to 24-hour format
    const convertTo24Hour = (time12h) => {
      const [time, modifier] = time12h.split(' ');
      let [hours, minutes] = time.split(':');
      if (hours === '12') {
        hours = '00';
      }
      if (modifier === 'PM') {
        hours = parseInt(hours, 10) + 12;
      }
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    };

    const time24Hour = convertTo24Hour(time);
    const rescheduledTime = new Date(`${date}T${time24Hour}`);

    const callback = await prisma.scheduledCallback.findUnique({
      where: { id }
    });

    if (!callback) {
      return res.status(404).json({ success: false, message: 'Callback not found' });
    }

    // Generate unique token for accept/reject
    const token = crypto.randomBytes(32).toString('hex');

    // Update callback with rescheduled time and pending status
    const updatedCallback = await prisma.scheduledCallback.update({
      where: { id },
      data: {
        rescheduledTime: rescheduledTime,
        rescheduleStatus: 'pending_acceptance',
        status: 'rescheduled'
      }
    });

    // Store token in metadata or create a separate table entry
    // For now, we'll include it in the email link
    const acceptUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/callback/reschedule/${id}?action=accept&token=${token}`;
    const rejectUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/callback/reschedule/${id}?action=reject&token=${token}`;

    // Send email to customer with accept/reject buttons
    const formattedDate = new Date(rescheduledTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = time;
    const oldFormattedDate = new Date(callback.scheduledTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const oldFormattedTime = new Date(callback.scheduledTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(to right, #7c3aed, #ec4899, #ef4444); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
          .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #7c3aed; }
          .old-time { background: #fee2e2; padding: 10px; border-radius: 6px; margin: 10px 0; }
          .new-time { background: #dcfce7; padding: 10px; border-radius: 6px; margin: 10px 0; }
          .button-container { text-align: center; margin: 30px 0; }
          .button { display: inline-block; padding: 12px 30px; margin: 0 10px; text-decoration: none; border-radius: 6px; font-weight: bold; }
          .accept-button { background: #10b981; color: white; }
          .reject-button { background: #ef4444; color: white; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">Callback Rescheduled</h2>
          </div>
          <div class="content">
            <p>Hello ${callback.customerName},</p>
            <p>We need to reschedule your callback request. Please review the new time and let us know if it works for you.</p>
            
            <div class="info-box">
              <div class="old-time">
                <strong>Previous Time:</strong><br>
                ${oldFormattedDate} at ${oldFormattedTime}
              </div>
              <div class="new-time">
                <strong>New Proposed Time:</strong><br>
                ${formattedDate} at ${formattedTime}
              </div>
            </div>
            
            <div class="button-container">
              <a href="${acceptUrl}" class="button accept-button">Accept New Time</a>
              <a href="${rejectUrl}" class="button reject-button">Reject & Request Different Time</a>
            </div>
            
            <p style="text-align: center; color: #6b7280; font-size: 14px;">
              If the buttons don't work, copy and paste these links:<br>
              Accept: ${acceptUrl}<br>
              Reject: ${rejectUrl}
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification from WZATCO Support System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await sendEmail({
        to: callback.customerEmail,
        subject: 'Callback Rescheduled - Action Required',
        html: emailHtml
      });
    } catch (emailError) {
      console.error('Error sending reschedule email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json({ success: true, callback: updatedCallback });
  } catch (error) {
    console.error('Error rescheduling callback:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  } finally {
    await prisma.$disconnect();
  }
}

