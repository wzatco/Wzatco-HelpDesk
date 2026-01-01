import prisma from '@/lib/prisma';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const conversationTags = await prisma.conversationTag.findMany({
        where: { conversationId: id },
        include: {
          Tag: true
        }
      });
      
      // Include status from ConversationTag for Video Call Tag
      const tags = conversationTags.map(ct => ({
        ...ct.Tag,
        conversationTagId: ct.id,
        status: ct.status // Include status for conditional colors
      }));
      
      return res.status(200).json({ tags });
    } catch (error) {
      console.error('Error fetching ticket tags:', error);
      return res.status(500).json({ message: 'Error fetching ticket tags', error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { tagId } = req.body;
      
      if (!tagId) {
        return res.status(400).json({ message: 'Tag ID is required' });
      }
      
      // Check if tag already exists on this ticket
      const existing = await prisma.conversationTag.findUnique({
        where: {
          conversationId_tagId: {
            conversationId: id,
            tagId: tagId
          }
        }
      });
      
      if (existing) {
        return res.status(400).json({ message: 'Tag already exists on this ticket' });
      }
      
      // Add tag to ticket
      const conversationTag = await prisma.conversationTag.create({
        data: {
          conversationId: id,
          tagId: tagId
        },
        include: {
          Tag: true
        }
      });
      
      // Create activity log
      try {
        const tag = await prisma.tag.findUnique({ where: { id: tagId } });
        await prisma.ticketActivity.create({
          data: {
            conversationId: id,
            activityType: 'tag_added',
            newValue: tag.name,
            performedBy: 'admin',
            performedByName: 'Admin'
          }
        });
      } catch (activityError) {
        console.error('Error creating activity log:', activityError);
        // Don't fail the request if activity logging fails
      }
      
      // Return tag with conversationTagId and status for Video Call Tag toggle
      return res.status(201).json({ 
        tag: {
          ...conversationTag.Tag,
          conversationTagId: conversationTag.id,
          status: conversationTag.status
        }
      });
    } catch (error) {
      console.error('Error adding tag to ticket:', error);
      return res.status(500).json({ message: 'Error adding tag to ticket', error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { tagId } = req.body;
      
      if (!tagId) {
        return res.status(400).json({ message: 'Tag ID is required' });
      }
      
      // Get tag name before deleting for activity log
      let tagName = '';
      try {
        const tag = await prisma.tag.findUnique({ where: { id: tagId } });
        tagName = tag?.name || '';
      } catch (e) {
        // Continue even if tag lookup fails
      }
      
      // Remove tag from ticket
      await prisma.conversationTag.delete({
        where: {
          conversationId_tagId: {
            conversationId: id,
            tagId: tagId
          }
        }
      });
      
      // Create activity log
      if (tagName) {
        try {
          await prisma.ticketActivity.create({
            data: {
              conversationId: id,
              activityType: 'tag_removed',
              oldValue: tagName,
              performedBy: 'admin',
              performedByName: 'Admin'
            }
          });
        } catch (activityError) {
          console.error('Error creating activity log:', activityError);
          // Don't fail the request if activity logging fails
        }
      }
      
      return res.status(200).json({ message: 'Tag removed successfully' });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Tag not found on this ticket' });
      }
      console.error('Error removing tag from ticket:', error);
      return res.status(500).json({ message: 'Error removing tag from ticket', error: error.message });
    }
  } else if (req.method === 'PATCH') {
    // Update tag status (for Video Call Tag toggle)
    try {
      const { conversationTagId, status } = req.body;
      
      console.log('PATCH /api/admin/tickets/[id]/tags - Request body:', { conversationTagId, status });
      
      if (!conversationTagId) {
        console.error('Missing conversationTagId');
        return res.status(400).json({ message: 'Conversation Tag ID is required' });
      }
      
      // Validate status
      if (status !== 'pending' && status !== 'done' && status !== null && status !== undefined) {
        console.error('Invalid status:', status);
        return res.status(400).json({ message: 'Status must be "pending", "done", or null' });
      }
      
      console.log('Updating ConversationTag:', { id: conversationTagId, newStatus: status || null });
      
      const updated = await prisma.conversationTag.update({
        where: { id: conversationTagId },
        data: { status: status || null },
        include: {
          Tag: true
        }
      });
      
      console.log('Update successful:', { 
        conversationTagId: updated.id, 
        status: updated.status,
        tagName: updated.Tag.name 
      });
      
      return res.status(200).json({ 
        tag: {
          ...updated.Tag,
          conversationTagId: updated.id,
          status: updated.status
        }
      });
    } catch (error) {
      console.error('Error updating tag status:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Tag not found on this ticket' });
      }
      
      // Check if it's a Prisma schema error
      if (error.message && error.message.includes('Unknown argument') || error.message.includes('status')) {
        console.error('⚠️  Prisma client may need regeneration! Run: npx prisma generate');
        return res.status(500).json({ 
          message: 'Database schema error. Please restart the server after running: npx prisma generate',
          error: error.message 
        });
      }
      
      return res.status(500).json({ message: 'Error updating tag status', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE', 'PATCH']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}

