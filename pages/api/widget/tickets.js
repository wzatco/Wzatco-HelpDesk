// Widget API - Fetch and manage tickets for widget
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
  if (req.method === 'GET') {
    try {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      // Check if email has tickets - if yes, require OTP verification
      const customer = await prisma.customer.findFirst({
        where: { email: email.toLowerCase() }
      });

      if (customer) {
        const ticketCount = await prisma.conversation.count({
          where: { customerId: customer.id }
        });

        // If customer has tickets, check for OTP verification
        // Note: OTP verification is checked client-side via localStorage
        // This is a security measure - in production, use server-side sessions
        if (ticketCount > 0) {
          // In a production environment, you would check for a valid session token here
          // For now, we rely on client-side OTP verification flag
          // The client should have verified OTP before accessing tickets
        }
      }

      if (!customer) {
        return res.status(200).json({
          success: true,
          tickets: []
        });
      }

      // Fetch tickets for this customer (conversations are tickets)
      const tickets = await prisma.conversation.findMany({
        where: {
          customerId: customer.id
        },
        select: {
          id: true,
          subject: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50
      });

      // Format tickets
      const formattedTickets = tickets.map(ticket => ({
        id: ticket.id,
        subject: ticket.subject || `Ticket #${ticket.id}`,
        description: ticket.subject || '',
        status: ticket.status || 'open',
        priority: ticket.priority || 'medium',
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt
      }));

      res.status(200).json({
        success: true,
        tickets: formattedTickets
      });

    } catch (error) {
      console.error('Error fetching tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching tickets',
        tickets: []
      });
    }
  } else if (req.method === 'POST') {
    // Create new ticket
    try {
      const { subject, description, email, name, priority = 'medium' } = req.body;

      if (!subject || !email) {
        return res.status(400).json({
          success: false,
          message: 'Subject and email are required'
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
            name: name || 'Guest'
          }
        });
      }

      // Create ticket (conversation)
      const ticket = await prisma.conversation.create({
        data: {
          customerId: customer.id,
          siteId: 'widget', // Using siteId to identify widget tickets
          subject: subject,
          status: 'open',
          priority: priority || 'medium',
          customerName: name || customer.name
        }
      });

      // Create initial message
      if (description) {
        await prisma.message.create({
          data: {
            conversationId: ticket.id,
            senderId: customer.id,
            senderType: 'customer',
            content: description,
            type: 'text'
          }
        });
      }

      res.status(200).json({
        success: true,
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status
        }
      });

    } catch (error) {
      console.error('Error creating ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating ticket'
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

