import { PrismaClient } from '@prisma/client';
import { parseMentions, findUserByMention } from '../../../../../lib/utils/mentions';
import { notifyMention } from '../../../../../lib/utils/notifications';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id } = req.query; // conversationId

  try {
    if (req.method === 'GET') {
      const notes = await prisma.ticketNote.findMany({
        where: { conversationId: id },
        orderBy: [
          { pinned: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      return res.status(200).json({ notes });
    }

    if (req.method === 'POST') {
      const { content, isPrivate = true, pinned = false } = req.body || {};

      if (!content || !content.trim()) {
        return res.status(400).json({ message: 'Content is required' });
      }

      // Get current admin profile for note attribution
      const adminProfile = await prisma.admin.findFirst({
        where: { email: 'admin@wzatco.com' }
      }).catch(() => null);

      const createdById = adminProfile?.id || 'admin';
      const createdByName = adminProfile?.name || 'Admin';

      const note = await prisma.ticketNote.create({
        data: {
          conversationId: id,
          content: content.trim(),
          isPrivate: Boolean(isPrivate),
          pinned: Boolean(pinned),
          createdById,
          createdByName
        }
      });

      // Get ticket info for notifications
      const conversation = await prisma.conversation.findUnique({
        where: { id },
        select: { id: true, subject: true }
      });

      // Parse and handle @mentions
      const mentions = parseMentions(content);
      if (mentions.length > 0 && conversation) {
        // Process mentions asynchronously (don't block the response)
        Promise.all(
          mentions.map(async (mention) => {
            const user = await findUserByMention(prisma, mention.mentionText);
            if (user && user.id !== createdById) {
              // Send mention notification
              await notifyMention(prisma, {
                ticketId: conversation.id,
                ticketSubject: conversation.subject,
                mentionedUserId: user.id,
                mentionedUserName: user.name,
                mentionedBy: createdByName,
                commentId: note.id,
                commentPreview: content.slice(0, 100),
                commentContent: content
              });
            }
          })
        ).catch(error => {
          console.error('Error processing mentions:', error);
        });
      }

      return res.status(201).json({ note });
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Notes API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}


