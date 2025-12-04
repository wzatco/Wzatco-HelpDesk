import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id, noteId } = req.query; // conversationId, noteId

  try {
    if (req.method === 'PUT') {
      const { content, isPrivate, pinned } = req.body || {};

      const note = await prisma.ticketNote.update({
        where: { id: noteId },
        data: {
          ...(content !== undefined ? { content } : {}),
          ...(isPrivate !== undefined ? { isPrivate: Boolean(isPrivate) } : {}),
          ...(pinned !== undefined ? { pinned: Boolean(pinned) } : {})
        }
      });

      return res.status(200).json({ note });
    }

    if (req.method === 'DELETE') {
      await prisma.ticketNote.delete({ where: { id: noteId } });
      return res.status(204).end();
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Note detail API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}


