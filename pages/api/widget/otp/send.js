// Widget API - Send OTP for email verification
import prisma, { ensurePrismaConnected } from '@/lib/prisma';
import { sendEmail } from '../../../../lib/email/service';

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Cleanup expired OTPs (runs periodically)
async function cleanupExpiredOTPs() {
  try {
    const now = new Date();
    const result = await prisma.oTPVerification.deleteMany({
      where: {
        expiresAt: {
          lt: now
        },
        verified: false
      }
    });
    if (result.count > 0) {
      console.log(`🧹 Cleaned up ${result.count} expired OTPs`);
    }
  } catch (error) {
    console.error('Error cleaning up expired OTPs:', error);
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Generate 6-digit OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    const emailLower = email.toLowerCase();

    // Delete any existing unverified OTPs for this email
    await prisma.oTPVerification.deleteMany({
      where: {
        email: emailLower,
        verified: false
      }
    });

    // Store OTP in database
    await prisma.oTPVerification.create({
      data: {
        email: emailLower,
        otp: otp,
        purpose: 'ticket_access',
        expiresAt: expiresAt,
        attempts: 0,
        maxAttempts: 5,
        verified: false
      }
    });

    // Send OTP via email using Amazon SES
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WZATCO Support - Email Verification</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7C3AED 0%, #EC4899 50%, #EF4444 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">WZATCO Support</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Email Verification Code</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello!</h2>
          <p style="color: #666; margin-bottom: 30px;">
            You've requested to access your support tickets. Please use the verification code below to verify your email address.
          </p>
          
          <div style="background: white; border: 2px dashed #7C3AED; border-radius: 10px; padding: 20px; margin: 30px 0;">
            <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Your verification code is:</p>
            <div style="font-size: 36px; font-weight: bold; color: #7C3AED; letter-spacing: 8px; font-family: 'Courier New', monospace;">
              ${otp}
            </div>
          </div>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} WZATCO. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    const emailText = `
WZATCO Support - Email Verification

Hello!

You've requested to access your support tickets. Please use the verification code below to verify your email address.

Your verification code is: ${otp}

This code will expire in 10 minutes. If you didn't request this code, please ignore this email.

© ${new Date().getFullYear()} WZATCO. All rights reserved.
    `;

    // Send email via Amazon SES
    const emailResult = await sendEmail({
      to: email,
      subject: 'WZATCO Support - Email Verification Code',
      html: emailHtml,
      text: emailText
    });

    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      // Still return success but log the error
      // In production, you might want to return an error here
    }

    // Security: Never log or return OTP in response
    // OTP is only sent via email for security purposes

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your email',
      emailSent: emailResult.success
    });

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending OTP'
    });
  }
}


