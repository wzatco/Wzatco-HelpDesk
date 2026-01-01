import prisma from '../../../../../../lib/prisma';
import { getCurrentAgent } from '../../../../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  // Verify agent authentication
  const agent = await getCurrentAgent(req);
  if (!agent) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id, noteId } = req.query;

  if (req.method === 'PUT') {
    try {
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
      if (note.createdById !== agent.id) {
        return res.status(403).json({ error: 'Forbidden: You can only edit your own notes' });
      }

      // Extract updateable fields from request body
      const { content, isPrivate, pinned } = req.body;
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

      // Update the note
      const updatedNote = await prisma.ticketNote.update({
        where: { id: noteId },
        data: updateData
      });

      return res.status(200).json({ note: updatedNote });
    } catch (error) {
      console.error('Error updating ticket note:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    try {
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
      if (note.createdById !== agent.id) {
        return res.status(403).json({ error: 'Forbidden: You can only delete your own notes' });
      }

      // Delete the note
      await prisma.ticketNote.delete({
        where: { id: noteId }
      });

      return res.status(200).json({ success: true, message: 'Note deleted successfully' });
    } catch (error) {
      console.error('Error deleting ticket note:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

