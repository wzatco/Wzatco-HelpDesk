// Widget API - Schedule Callback
import prisma from '@/lib/prisma';
import { sendEmail } from '../../../lib/email/service';
import { createNotification } from '../../../lib/utils/notifications';



export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { date, time, phoneNumber, reason, email, name } = req.body;

    if (!date || !time || !phoneNumber || !email) {
      return res.status(400).json({
        success: false,
        message: 'Date, time, phone number, and email are required'
      });
    }

    // Find or create customer
    let customer = await prisma.customer.findFirst({
      where: { email: email.toLowerCase() }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: email.toLowerCase(),
          name: name || 'Guest',
          phone: phoneNumber,
        }
      });

      // Trigger webhook for customer creation
      try {
        const { triggerWebhook } = await import('../../../lib/utils/webhooks');
        await triggerWebhook('customer.created', {
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            location: customer.location,
            createdAt: customer.createdAt
          }
        });
      } catch (webhookError) {
        console.error('Error triggering customer.created webhook:', webhookError);
        // Don't fail callback scheduling if webhook fails
      }
    } else if (!customer.phone) {
      // Update phone if not set
      const oldCustomer = { ...customer };
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { phone: phoneNumber }
      });

      // Trigger webhook for customer update
      try {
        const { triggerWebhook } = await import('../../../lib/utils/webhooks');
        await triggerWebhook('customer.updated', {
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            location: customer.location,
            updatedAt: customer.updatedAt
          },
          changes: {
            phone: oldCustomer.phone !== customer.phone
          }
        });
      } catch (webhookError) {
        console.error('Error triggering customer.updated webhook:', webhookError);
        // Don't fail callback scheduling if webhook fails
      }
    }

    // Convert time from 12-hour format (e.g., "09:00 AM") to 24-hour format
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
    const scheduledTime = new Date(`${date}T${time24Hour}`);
    
    const callback = await prisma.scheduledCallback.create({
      data: {
        customerId: customer.id,
        customerName: name || customer.name || 'Guest',
        customerEmail: email.toLowerCase(),
        phoneNumber: phoneNumber,
        reason: reason && reason.trim() ? reason.trim() : null,
        scheduledTime: scheduledTime,
        status: 'pending'
      }
    });

    // Send email to admin
    const customerName = name || customer.name || 'Guest';
    const formattedDate = new Date(scheduledTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = time;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(to right, #7c3aed, #ec4899, #ef4444); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
          .info-row { margin: 15px 0; padding: 12px; background: white; border-radius: 6px; border-left: 4px solid #7c3aed; }
          .label { font-weight: bold; color: #6b7280; font-size: 14px; }
          .value { color: #111827; font-size: 16px; margin-top: 4px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">New Callback Scheduled</h2>
          </div>
          <div class="content">
            <p>A customer has scheduled a callback request. Details below:</p>
            
            <div class="info-row">
              <div class="label">Customer Name</div>
              <div class="value">${customerName}</div>
            </div>
            
            <div class="info-row">
              <div class="label">Email</div>
              <div class="value">${email}</div>
            </div>
            
            <div class="info-row">
              <div class="label">Phone Number</div>
              <div class="value">${phoneNumber}</div>
            </div>
            
            <div class="info-row">
              <div class="label">Scheduled Date</div>
              <div class="value">${formattedDate}</div>
            </div>
            
            <div class="info-row">
              <div class="label">Scheduled Time</div>
              <div class="value">${formattedTime}</div>
            </div>
            ${reason && reason.trim() ? `
            <div class="info-row">
              <div class="label">Reason for Callback</div>
              <div class="value">${reason.trim()}</div>
            </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>This is an automated notification from WZATCO Support System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email to admin
    try {
      await sendEmail({
        to: 'support@wzatco.com',
        subject: `New Callback Scheduled - ${customerName}`,
        html: emailHtml
      });
    } catch (emailError) {
      console.error('Error sending callback email:', emailError);
      // Don't fail the request if email fails
    }

    // Create notification for admin panel
    try {
      await createNotification(prisma, {
        userId: null, // Notify all admins
        type: 'callback_scheduled',
        title: 'New Callback Scheduled',
        message: `${customerName} has scheduled a callback for ${formattedDate} at ${formattedTime}`,
        link: null,
        metadata: JSON.stringify({
          callbackId: callback.id,
          customerName,
          customerEmail: email,
          phoneNumber,
          reason: reason && reason.trim() ? reason.trim() : null,
          scheduledTime: scheduledTime.toISOString()
        }),
        sendEmail: false // Already sent email above
      });
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the request if notification fails
    }

    res.status(200).json({
      success: true,
      callback: {
        id: callback.id,
        scheduledTime: callback.scheduledTime
      },
      message: 'Callback scheduled successfully'
    });

  } catch (error) {
    console.error('Error scheduling callback:', error);
    res.status(500).json({
      success: false,
      message: 'Error scheduling callback',
      error: error.message
    });
  }
}

