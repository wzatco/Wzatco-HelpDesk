// Check for existing open tickets by email
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
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { email, phone } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Build where clause to check by email AND/OR phone
    // Check tickets that match EITHER email OR phone (if phone provided)
    const whereClause = {
      status: {
        in: ['open', 'pending', 'in_progress']
      }
    };

    // If phone is provided, check by both email OR phone
    if (phone && phone.trim()) {
      whereClause.OR = [
        { customerEmail: email.toLowerCase().trim() },
        { customerPhone: phone.trim() }
      ];
    } else {
      // Only check by email if phone not provided
      whereClause.customerEmail = email.toLowerCase().trim();
    }

    // Find open tickets for this email and/or phone
    const openTickets = await prisma.conversation.findMany({
      where: whereClause,
      select: {
        ticketNumber: true,
        subject: true,
        status: true,
        priority: true,
        createdAt: true,
        customerEmail: true,
        customerPhone: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5 // Limit to 5 most recent
    });

    return res.status(200).json({
      success: true,
      hasOpenTickets: openTickets.length > 0,
      tickets: openTickets
    });

  } catch (error) {
    console.error('Error checking existing tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

