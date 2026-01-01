import prisma, { ensurePrismaConnected } from '../../../../../lib/prisma';
import { parseMentions, findUserByMention } from '../../../../../lib/utils/mentions';
import { notifyMention } from '../../../../../lib/utils/notifications';
import { verifyToken } from '../../../../../lib/auth';

export default async function handler(req, res) {
  // Ensure Prisma is connected before proceeding
  await ensurePrismaConnected();

  const { id } = req.query; // conversationId

  // Get current admin ID from token
  const decoded = verifyToken(req);
  const adminId = decoded?.adminId || decoded?.userId || null;

  try {
    if (req.method === 'GET') {
      // Get admin.id if adminId is actually a userId
      let actualAdminId = adminId;
      if (adminId) {
        const userAdmin = await prisma.admin.findFirst({
          where: { userId: adminId },
          select: { id: true }
        }).catch(() => null);
        
        // Use admin.id if found, otherwise use adminId as-is
        if (userAdmin) {
          actualAdminId = userAdmin.id;
        }
      }

      // Security: Filter notes - show public notes OR private notes created by this admin
      const notes = await prisma.ticketNote.findMany({
        where: {
          conversationId: id,
          OR: [
            { isPrivate: false }, // Everyone sees public notes
            ...(actualAdminId ? [
              { isPrivate: true, createdById: actualAdminId }, // Admin's private notes
              ...(adminId !== actualAdminId ? [{ isPrivate: true, createdById: adminId }] : []) // Also check original adminId
            ] : [])
          ]
        },
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
      let createdById = adminId || 'admin';
      let createdByName = 'Admin';

      if (adminId) {
        const adminProfile = await prisma.admin.findUnique({
          where: { id: adminId },
          select: { id: true, name: true }
        }).catch(() => null);

        if (adminProfile) {
          createdById = adminProfile.id;
          createdByName = adminProfile.name || 'Admin';
        } else {
          // Fallback: try to find by userId if adminId not found
          const userAdmin = await prisma.admin.findFirst({
            where: { userId: adminId },
            select: { id: true, name: true }
          }).catch(() => null);

          if (userAdmin) {
            createdById = userAdmin.id;
            createdByName = userAdmin.name || 'Admin';
          }
        }
      }

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
        where: { ticketNumber: id },
        select: { ticketNumber: true, subject: true }
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
                ticketId: conversation.ticketNumber,
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
  }
}


