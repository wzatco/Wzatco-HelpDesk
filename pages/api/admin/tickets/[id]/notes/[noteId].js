import prisma, { ensurePrismaConnected } from '../../../../../../lib/prisma';
import { verifyToken } from '../../../../../../lib/auth';

export default async function handler(req, res) {
  // Ensure Prisma is connected before proceeding
  await ensurePrismaConnected();

  const { id, noteId } = req.query; // conversationId, noteId

  // Get current admin ID from token
  const decoded = verifyToken(req);
  const adminId = decoded?.adminId || decoded?.userId || null;

  if (!adminId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'PUT') {
      // Find the note first
      const note = await prisma.ticketNote.findUnique({
        where: { id: noteId }
      });

      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      // Verify the note belongs to this ticket
      if (note.conversationId !== id) {
        return res.status(400).json({ error: 'Note does not belong to this ticket' });
      }

      // Strict ownership check - only creator can update
      // Check if note was created by this admin (check both adminId and admin.id)
      let isOwner = note.createdById === adminId;
      
      if (!isOwner) {
        // Try to find admin by userId to get admin.id
        const userAdmin = await prisma.admin.findFirst({
          where: { userId: adminId },
          select: { id: true }
        }).catch(() => null);
        
        if (userAdmin && note.createdById === userAdmin.id) {
          isOwner = true;
        }
      }

      if (!isOwner) {
        return res.status(403).json({ error: 'Forbidden: You can only edit your own notes' });
      }

      const { content, isPrivate, pinned } = req.body || {};
      const updateData = {};

      if (content !== undefined) {
        if (!content || !content.trim()) {
          return res.status(400).json({ error: 'Note content cannot be empty' });
        }
        updateData.content = content.trim();
      }

      if (isPrivate !== undefined) {
        updateData.isPrivate = Boolean(isPrivate);
      }

      if (pinned !== undefined) {
        updateData.pinned = Boolean(pinned);
      }

      const updatedNote = await prisma.ticketNote.update({
        where: { id: noteId },
        data: updateData
      });

      return res.status(200).json({ note: updatedNote });
    }

    if (req.method === 'DELETE') {
      // Find the note first
      const note = await prisma.ticketNote.findUnique({
        where: { id: noteId }
      });

      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      // Verify the note belongs to this ticket
      if (note.conversationId !== id) {
        return res.status(400).json({ error: 'Note does not belong to this ticket' });
      }

      // Strict ownership check - only creator can delete
      // Check if note was created by this admin (check both adminId and admin.id)
      let isOwner = note.createdById === adminId;
      
      if (!isOwner) {
        // Try to find admin by userId to get admin.id
        const userAdmin = await prisma.admin.findFirst({
          where: { userId: adminId },
          select: { id: true }
        }).catch(() => null);
        
        if (userAdmin && note.createdById === userAdmin.id) {
          isOwner = true;
        }
      }

      if (!isOwner) {
        return res.status(403).json({ error: 'Forbidden: You can only delete your own notes' });
      }

      await prisma.ticketNote.delete({ where: { id: noteId } });
      return res.status(200).json({ success: true, message: 'Note deleted successfully' });
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Note detail API error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}


