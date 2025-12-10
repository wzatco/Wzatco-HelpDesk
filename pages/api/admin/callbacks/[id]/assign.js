// Admin API - Assign Callback to Agent
import { PrismaClient } from '@prisma/client';
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
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ success: false, message: 'Agent ID is required' });
    }

    // Fetch callback and agent
    const callback = await prisma.scheduledCallback.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!callback) {
      return res.status(404).json({ success: false, message: 'Callback not found' });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    // Update callback
    const updatedCallback = await prisma.scheduledCallback.update({
      where: { id },
      data: {
        agentId: agentId,
        status: 'assigned'
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Send email to customer
    const formattedDate = new Date(callback.scheduledTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = new Date(callback.scheduledTime).toLocaleTimeString('en-US', {
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
          .info-row { margin: 15px 0; padding: 12px; background: white; border-radius: 6px; border-left: 4px solid #7c3aed; }
          .label { font-weight: bold; color: #6b7280; font-size: 14px; }
          .value { color: #111827; font-size: 16px; margin-top: 4px; }
          .agent-card { background: #ede9fe; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">Your Callback Has Been Assigned</h2>
          </div>
          <div class="content">
            <p>Hello ${callback.customerName},</p>
            <p>Great news! Your callback request has been assigned to one of our support agents.</p>
            
            <div class="agent-card">
              <div class="label">Assigned Agent</div>
              <div class="value" style="font-size: 18px; font-weight: bold; color: #7c3aed;">${agent.name}</div>
              ${agent.email ? `<div style="color: #6b7280; margin-top: 4px;">${agent.email}</div>` : ''}
            </div>
            
            <div class="info-row">
              <div class="label">Scheduled Date</div>
              <div class="value">${formattedDate}</div>
            </div>
            
            <div class="info-row">
              <div class="label">Scheduled Time</div>
              <div class="value">${formattedTime}</div>
            </div>
            
            <div class="info-row">
              <div class="label">Your Phone Number</div>
              <div class="value">${callback.phoneNumber}</div>
            </div>
            
            <p style="margin-top: 20px;">Our agent will call you at the scheduled time. If you need to reschedule or have any questions, please contact us.</p>
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
        subject: `Your Callback Has Been Assigned - ${agent.name}`,
        html: emailHtml
      });
    } catch (emailError) {
      console.error('Error sending assignment email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json({ success: true, callback: updatedCallback });
  } catch (error) {
    console.error('Error assigning callback:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  } finally {
    await prisma.$disconnect();
  }
}

