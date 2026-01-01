/**
 * EXAMPLE: Protected API Endpoint
 * This is a demonstration of how to protect API endpoints with permission checking
 * 
 * Copy this pattern to other API endpoints to enforce role-based access control
 */

import prisma from '@/lib/prisma';
import { checkPermissionOrFail } from '../../../../lib/permissions';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    // Get user ID from session/token/header
    // TODO: Replace this with your actual authentication method
    const userId = req.headers['x-user-id'] || req.query.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized: Please log in' 
      });
    }

    // Handle GET requests - View tickets
    if (req.method === 'GET') {
      // Check if user has permission to view tickets
      const hasAccess = await checkPermissionOrFail(
        userId,
        'admin.tickets', // Required permission
        res
      );

      if (!hasAccess) {
        return; // checkPermissionOrFail already sent error response
      }

      // User has permission, proceed with fetching tickets
      const tickets = await prisma.conversation.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json({ 
        success: true, 
        tickets 
      });
    }

    // Handle POST requests - Create ticket
    if (req.method === 'POST') {
      // Check if user has permission to create tickets
      const hasAccess = await checkPermissionOrFail(
        userId,
        'admin.tickets.create', // Required permission
        res
      );

      if (!hasAccess) {
        return; // checkPermissionOrFail already sent error response
      }

      // User has permission, proceed with creating ticket
      const { subject, message } = req.body;

      const ticket = await prisma.conversation.create({
        data: {
          subject,
          // ... other fields
        }
      });

      return res.status(201).json({ 
        success: true, 
        ticket 
      });
    }

    // Handle DELETE requests - Delete ticket
    if (req.method === 'DELETE') {
      // Check if user has permission to delete tickets
      const hasAccess = await checkPermissionOrFail(
        userId,
        'admin.tickets.delete', // Required permission
        res
      );

      if (!hasAccess) {
        return; // checkPermissionOrFail already sent error response
      }

      // User has permission, proceed with deleting ticket
      const { ticketId } = req.body;

      await prisma.conversation.delete({
        where: { ticketNumber: ticketId }
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Ticket deleted successfully' 
      });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).json({ 
      success: false, 
      message: `Method ${req.method} not allowed` 
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  } finally {
    await prisma.$disconnect();
  }
}

