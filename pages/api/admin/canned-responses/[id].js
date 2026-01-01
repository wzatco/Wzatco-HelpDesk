import prisma, { ensurePrismaConnected } from '@/lib/prisma';
import { getCurrentUserId, verifyToken } from '@/lib/auth';
import { getCurrentAgentId } from '@/lib/utils/agent-auth';

/**
 * PUT /api/admin/canned-responses/[id]
 * Update a canned response
 */
async function handlePut(req, res) {
  await ensurePrismaConnected();

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

    const { id } = req.query;
    const { shortcut, content, category, isPublic } = req.body;

    // Find the response
    const existing = await prisma.cannedResponse.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Canned response not found'
      });
    }

    // Check ownership (unless it's public and user is admin)
    if (existing.createdBy !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own responses'
      });
    }

    // If shortcut is being changed, check for duplicates
    if (shortcut && shortcut.trim().toLowerCase() !== existing.shortcut) {
      const duplicate = await prisma.cannedResponse.findUnique({
        where: {
          unique_shortcut_per_user: {
            shortcut: shortcut.trim().toLowerCase(),
            createdBy: currentUserId
          }
        }
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: 'A response with this shortcut already exists'
        });
      }
    }

    // Update the response
    const updated = await prisma.cannedResponse.update({
      where: { id },
      data: {
        ...(shortcut && { shortcut: shortcut.trim().toLowerCase() }),
        ...(content !== undefined && { content: content.trim() }),
        ...(category !== undefined && { category: category?.trim() || null }),
        ...(isPublic !== undefined && { isPublic: isPublic === true })
      }
    });

    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Canned response updated successfully'
    });
  } catch (error) {
    console.error('Error updating canned response:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * DELETE /api/admin/canned-responses/[id]
 * Delete a canned response
 */
async function handleDelete(req, res) {
  await ensurePrismaConnected();

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

    const { id } = req.query;

    // Find the response
    const existing = await prisma.cannedResponse.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Canned response not found'
      });
    }

    // Check ownership
    if (existing.createdBy !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own responses'
      });
    }

    // Delete the response
    await prisma.cannedResponse.delete({
      where: { id }
    });

    return res.status(200).json({
      success: true,
      message: 'Canned response deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting canned response:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

export default async function handler(req, res) {
  if (req.method === 'PUT') {
    return handlePut(req, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res);
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

