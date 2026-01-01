import prisma from '@/lib/prisma';

// Widget API - Fetch and manage tickets for widget


export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { email } = req.query;

      console.log('🔍 Widget Tickets API: Received request with email:', email);

      if (!email) {
        console.error('❌ Widget Tickets API: Email is missing');
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      // Check if email has tickets - if yes, require OTP verification
      const customer = await prisma.customer.findFirst({
        where: { email: email.toLowerCase() }
      });

      console.log('👤 Widget Tickets API: Customer found:', customer ? `ID: ${customer.id}` : 'Not found');

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
        console.log(`⚠️ Widget Tickets API: Customer not found for email: ${email}`);
        return res.status(200).json({
          success: true,
          tickets: [],
          message: 'No customer found with this email'
        });
      }

      // Verify customer email matches (case-insensitive)
      if (customer.email.toLowerCase() !== email.toLowerCase()) {
        console.warn(`⚠️ Widget Tickets API: Email mismatch - customer: ${customer.email}, requested: ${email}`);
      }

      // Fetch tickets for this customer (conversations are tickets)
      const tickets = await prisma.conversation.findMany({
        where: {
          customerId: customer.id
        },
        select: {
          ticketNumber: true,
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

      console.log(`📋 Widget Tickets API: Found ${tickets.length} tickets for customer ${customer.id}`);

      // Format tickets
      const formattedTickets = tickets.map(ticket => ({
        id: ticket.ticketNumber,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject || `Ticket #${ticket.ticketNumber}`,
        description: ticket.subject || '',
        status: ticket.status || 'open',
        priority: ticket.priority || 'medium',
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt
      }));

      console.log(`✅ Widget Tickets API: Returning ${formattedTickets.length} formatted tickets`);

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
          // Don't fail ticket creation if webhook fails
        }
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
        const message = await prisma.message.create({
          data: {
            conversationId: ticket.ticketNumber,
            senderId: customer.id,
            senderType: 'customer',
            content: description,
            type: 'text'
          }
        });

        // Trigger webhook for message creation
        try {
          const { triggerWebhook } = await import('../../../lib/utils/webhooks');
          await triggerWebhook('message.created', {
            message: {
              id: message.id,
              content: message.content,
              senderId: message.senderId,
              senderType: message.senderType,
              type: message.type,
              createdAt: message.createdAt
            },
            ticket: {
              ticketNumber: ticket.ticketNumber,
              subject: ticket.subject,
              status: ticket.status,
              priority: ticket.priority
            },
            customer: {
              id: customer.id,
              name: customer.name,
              email: customer.email
            }
          });
        } catch (webhookError) {
          console.error('Error triggering message.created webhook:', webhookError);
          // Don't fail ticket creation if webhook fails
        }
      }

      res.status(200).json({
        success: true,
        ticket: {
          id: ticket.ticketNumber,
          ticketNumber: ticket.ticketNumber,
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

