import prisma from '../../../../../lib/prisma';
import { getCurrentAgent } from '../../../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  // Verify agent authentication
  const agent = await getCurrentAgent(req);
  if (!agent) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const ticketTags = await prisma.conversationTag.findMany({
        where: { conversationId: id },
        include: {
          Tag: true
        }
      });
      
      const tags = ticketTags.map(tt => tt.Tag);
      
      return res.status(200).json({ tags });
    } catch (error) {
      console.error('Error fetching ticket tags:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { tagId } = req.body;
      
      if (!tagId) {
        return res.status(400).json({ error: 'tagId is required' });
      }

      // Check if tag is already assigned
      const existing = await prisma.conversationTag.findFirst({
        where: {
          conversationId: id,
          tagId
        }
      });

      if (existing) {
        return res.status(400).json({ error: 'Tag already assigned to this ticket' });
      }

      const ticketTag = await prisma.conversationTag.create({
        data: {
          conversationId: id,
          tagId
        },
        include: {
          Tag: true
        }
      });
      
      return res.status(201).json({ tag: ticketTag.Tag });
    } catch (error) {
      console.error('Error adding ticket tag:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { tagId } = req.body;
      
      if (!tagId) {
        return res.status(400).json({ error: 'tagId is required' });
      }

      await prisma.conversationTag.deleteMany({
        where: {
          conversationId: id,
          tagId
        }
      });
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error removing ticket tag:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
