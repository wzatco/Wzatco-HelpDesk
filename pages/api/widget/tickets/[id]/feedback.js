// Widget API - Submit feedback for a ticket
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
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { id } = req.query;
    const { rating, comment, customerEmail } = req.body;

    // Validation
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Ticket ID is required'
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    if (!customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Customer email is required'
      });
    }

    // Find customer by email
    const customer = await prisma.customer.findFirst({
      where: { email: customerEmail.toLowerCase() }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Fetch ticket (conversation) by ticketNumber
    const ticket = await prisma.conversation.findUnique({
      where: {
        ticketNumber: id
      },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Verify customer owns this ticket
    if (ticket.customerId !== customer.id && ticket.customerEmail?.toLowerCase() !== customerEmail.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'You can only submit feedback for your own tickets'
      });
    }

    // Verify ticket is closed or resolved
    if (ticket.status !== 'closed' && ticket.status !== 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be submitted for closed or resolved tickets'
      });
    }

    // Check if feedback already exists for this ticket
    const existingFeedback = await prisma.feedback.findFirst({
      where: {
        conversationId: id,
        customerId: customer.id
      }
    });

    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: 'Feedback has already been submitted for this ticket'
      });
    }

    // Capture the current assigneeId (Resolver Takes Credit strategy)
    const agentId = ticket.assigneeId || null;

    // Create feedback record
    const feedback = await prisma.feedback.create({
      data: {
        conversationId: id,
        rating: parseInt(rating),
        comment: comment?.trim() || null,
        customerId: customer.id,
        customerName: customer.name,
        agentId: agentId // Link to the agent who resolved the ticket
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

    return res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: {
        id: feedback.id,
        rating: feedback.rating,
        comment: feedback.comment,
        agentId: feedback.agentId,
        agent: feedback.agent,
        submittedAt: feedback.submittedAt
      }
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    return res.status(500).json({
      success: false,
      message: 'Error submitting feedback',
      error: error.message
    });
  }
}

