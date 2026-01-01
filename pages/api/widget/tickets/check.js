import prisma from '@/lib/prisma';

// Widget API - Check if email has existing tickets (for OTP requirement)


export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find customer by email
    const customer = await prisma.customer.findFirst({
      where: { email: email.toLowerCase() }
    });

    if (!customer) {
      return res.status(200).json({
        success: true,
        hasTickets: false,
        ticketCount: 0
      });
    }

    // Check if customer has any tickets (conversations)
    const ticketCount = await prisma.conversation.count({
      where: {
        customerId: customer.id
      }
    });

    res.status(200).json({
      success: true,
      hasTickets: ticketCount > 0,
      ticketCount
    });

  } catch (error) {
    console.error('Error checking tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking tickets',
      hasTickets: false,
      ticketCount: 0
    });
  }
}

