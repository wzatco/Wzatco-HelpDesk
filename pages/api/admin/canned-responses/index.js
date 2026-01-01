import prisma from '../../../../lib/prisma';
import { getCurrentUserId, verifyToken } from '../../../../lib/auth';
import { getCurrentAgentId } from '../../../../lib/utils/agent-auth';

/**
 * GET /api/admin/canned-responses
 * Fetch all canned responses (public + user's private)
 * Query params: ?search=term
 */
async function handleGet(req, res) {
    try {
    // Identify current user (Admin or Agent)
    const adminUserId = getCurrentUserId(req);
    const agentId = await getCurrentAgentId(req);
    const decoded = verifyToken(req);

    let currentUserId = null;

    // Check if user is an Admin
    if (adminUserId && decoded?.adminId) {
      currentUserId = decoded.adminId;
    } else if (adminUserId) {
      const user = await prisma.user.findUnique({
        where: { id: adminUserId },
        select: { email: true }
      });
      if (user?.email) {
        const admin = await prisma.admin.findUnique({
          where: { email: user.email },
          select: { id: true }
        });
        if (admin) {
          currentUserId = admin.id;
        }
      }
    }

    // If not admin, check if user is an Agent
    if (!currentUserId && agentId) {
      currentUserId = agentId;
    }

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { search } = req.query;

    // Build where clause
    const where = {
      OR: [
        { isPublic: true }, // Public responses
        { createdBy: currentUserId } // User's own responses
      ]
    };

    // Add search filter if provided
    if (search && search.trim()) {
      where.AND = [
        {
          OR: [
            { shortcut: { contains: search.trim(), mode: 'insensitive' } },
            { content: { contains: search.trim(), mode: 'insensitive' } },
            { category: { contains: search.trim(), mode: 'insensitive' } }
          ]
        }
      ];
    }

    const responses = await prisma.cannedResponse.findMany({
      where,
      orderBy: [
        { isPublic: 'desc' }, // Public first
        { shortcut: 'asc' } // Then alphabetically
      ]
    });

    return res.status(200).json({
      success: true,
      data: responses
    });
  } catch (error) {
    console.error('Error fetching canned responses:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * POST /api/admin/canned-responses
 * Create a new canned response
 */
async function handlePost(req, res) {
    try {
    // Identify current user (Admin or Agent)
    const adminUserId = getCurrentUserId(req);
    const agentId = await getCurrentAgentId(req);
    const decoded = verifyToken(req);

    let currentUserId = null;

    // Check if user is an Admin
    if (adminUserId && decoded?.adminId) {
      currentUserId = decoded.adminId;
    } else if (adminUserId) {
      const user = await prisma.user.findUnique({
        where: { id: adminUserId },
        select: { email: true }
      });
      if (user?.email) {
        const admin = await prisma.admin.findUnique({
          where: { email: user.email },
          select: { id: true }
        });
        if (admin) {
          currentUserId = admin.id;
        }
      }
    }

    // If not admin, check if user is an Agent
    if (!currentUserId && agentId) {
      currentUserId = agentId;
    }

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { shortcut, content, category, isPublic } = req.body;

    // Validation
    if (!shortcut || !content) {
      return res.status(400).json({
        success: false,
        message: 'Shortcut and content are required'
      });
    }

    // Check for duplicate shortcut for this user
    const existing = await prisma.cannedResponse.findUnique({
      where: {
        unique_shortcut_per_user: {
          shortcut: shortcut.trim().toLowerCase(),
          createdBy: currentUserId
        }
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A response with this shortcut already exists'
      });
    }

    // Create the response
    const response = await prisma.cannedResponse.create({
      data: {
        shortcut: shortcut.trim().toLowerCase(),
        content: content.trim(),
        category: category?.trim() || null,
        isPublic: isPublic === true,
        createdBy: currentUserId
      }
    });

    return res.status(201).json({
      success: true,
      data: response,
      message: 'Canned response created successfully'
    });
  } catch (error) {
    console.error('Error creating canned response:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

