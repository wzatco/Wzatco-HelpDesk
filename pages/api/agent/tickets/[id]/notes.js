import prisma from '../../../../../lib/prisma';
import { getCurrentAgent } from '../../../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  // Verify agent authentication
  let agent;
  try {
    agent = await getCurrentAgent(req);
  } catch (error) {
    console.error('Error authenticating agent:', error);
    return res.status(500).json({ error: 'Authentication error', message: error.message });
  }
  
  if (!agent) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      // Security: Filter notes - show public notes OR private notes created by this agent
      const notes = await prisma.ticketNote.findMany({
        where: {
          conversationId: id,
          OR: [
            { isPrivate: false }, // Everyone sees public notes
            { isPrivate: true, createdById: agent.id } // Only creator sees their private notes
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return res.status(200).json({ notes });
    } catch (error) {
      console.error('Error fetching ticket notes:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { content, isPrivate = true } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Note content is required' });
      }

      const note = await prisma.ticketNote.create({
        data: {
          conversationId: id,
          content: content.trim(),
          isPrivate,
          createdById: agent.id,
          createdByName: agent.name
        }
      });
      
      return res.status(201).json({ note });
    } catch (error) {
      console.error('Error creating ticket note:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
