// Widget API - Verify OTP for email verification
import { PrismaClient } from '@prisma/client';

// Prisma singleton pattern
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
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const emailLower = email.toLowerCase();

    // Find the most recent unverified OTP for this email
    const otpRecord = await prisma.oTPVerification.findFirst({
      where: {
        email: emailLower,
        verified: false,
        purpose: 'ticket_access'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or expired. Please request a new OTP.'
      });
    }

    // Check if expired
    if (new Date() > otpRecord.expiresAt) {
      // Mark as expired (soft delete by updating)
      await prisma.oTPVerification.update({
        where: { id: otpRecord.id },
        data: { verified: true } // Mark as processed to prevent reuse
      });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new OTP.'
      });
    }

    // Check attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      // Mark as exhausted
      await prisma.oTPVerification.update({
        where: { id: otpRecord.id },
        data: { verified: true } // Mark as processed
      });
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      // Increment attempts
      const updatedRecord = await prisma.oTPVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 }
      });
      
      const remainingAttempts = otpRecord.maxAttempts - updatedRecord.attempts;
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
        remainingAttempts
      });
    }

    // OTP verified successfully - mark as verified
    await prisma.oTPVerification.update({
      where: { id: otpRecord.id },
      data: {
        verified: true,
        verifiedAt: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully'
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP'
    });
  }
}

