// Admin API - Deny Callback
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
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Denial reason is required' });
    }

    const callback = await prisma.scheduledCallback.update({
      where: { id },
      data: {
        status: 'denied',
        denialReason: reason.trim()
      }
    });

    // Send email to customer
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(to right, #dc2626, #ef4444); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
          .reason-box { background: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">Callback Request Update</h2>
          </div>
          <div class="content">
            <p>Hello ${callback.customerName},</p>
            <p>We regret to inform you that your callback request has been denied.</p>
            
            <div class="reason-box">
              <strong>Reason:</strong>
              <p style="margin-top: 8px; color: #991b1b;">${reason}</p>
            </div>
            
            <p>If you have any questions or would like to discuss this further, please feel free to contact our support team.</p>
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
        subject: 'Callback Request Update - WZATCO Support',
        html: emailHtml
      });
    } catch (emailError) {
      console.error('Error sending denial email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json({ success: true, callback });
  } catch (error) {
    console.error('Error denying callback:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  } finally {
    await prisma.$disconnect();
  }
}

