import prisma, { ensurePrismaConnected } from '@/lib/prisma';


export default async function handler(req, res) {
  await ensurePrismaConnected();
  const { id } = req.query;

  if (req.method === 'PATCH') {
    // Mark notification as read
    try {
      const { read } = req.body;

      // Check if notification exists first
      const existing = await prisma.notification.findUnique({
        where: { id }
      });

      if (!existing) {
        // Notification doesn't exist (might be old format notification)
        // Return success anyway to avoid errors in UI
        return res.status(200).json({ 
          message: 'Notification not found (may be old format)',
          notification: { id, read: true }
        });
      }

      const notification = await prisma.notification.update({
        where: { id },
        data: {
          read: read !== undefined ? read : true,
          readAt: read !== undefined && read ? new Date() : null
        }
      });

      res.status(200).json({ notification });
    } catch (error) {
      console.error('Error updating notification:', error);
      // If notification doesn't exist, return success to avoid breaking UI
      if (error.code === 'P2025' || (error.message && error.message.includes('undefined'))) {
        return res.status(200).json({ 
          message: 'Notification not found',
          notification: { id, read: true }
        });
      }
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'DELETE') {
    // Delete notification
    try {
      await prisma.notification.delete({
        where: { id }
      });

      res.status(200).json({ message: 'Notification deleted successfully' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      // If notification doesn't exist, return success
      if (error.code === 'P2025') {
        return res.status(200).json({ message: 'Notification not found (may be old format)' });
      }
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

