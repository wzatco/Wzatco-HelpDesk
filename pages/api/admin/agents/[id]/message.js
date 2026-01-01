import prisma, { ensurePrismaConnected } from '@/lib/prisma';


export default async function handler(req, res) {
  const { id } = req.query; // agent id

  if (req.method === 'POST') {
    try {
      const { content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ message: 'Message content is required' });
      }

      // Try to find agent by slug first, then by id for backward compatibility
      let agent = await prisma.agent.findUnique({
        where: { slug: id }
      });

      if (!agent) {
        agent = await prisma.agent.findUnique({
          where: { id }
        });
      }

      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }

      // Get or create admin profile
      const adminProfile = await prisma.admin.findFirst();
      if (!adminProfile) {
        return res.status(500).json({ message: 'Admin profile not found' });
      }

      // Check if there's an existing conversation between admin and this agent
      // We'll use a special siteId for admin-agent conversations
      const siteId = 'admin-agent-chat';
      let conversation = await prisma.conversation.findFirst({
        where: {
          siteId,
          assigneeId: agent.id,
          customerName: adminProfile.name || 'Admin'
        }
      });

      // If no conversation exists, create one
      if (!conversation) {
        // Generate ticket number for admin-agent conversation
        const prefix = 'TKT';
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const randomLetters = Array.from({ length: 3 }, () => 
          letters[Math.floor(Math.random() * letters.length)]
        ).join('');
        const ticketNumber = `${prefix}-${year}${month}-${day}-${randomLetters}`;
        
        conversation = await prisma.conversation.create({
          data: {
            ticketNumber: ticketNumber,
            siteId,
            status: 'open',
            subject: `Admin - ${agent.name} Conversation`,
            assigneeId: agent.id,
            customerName: adminProfile.name || 'Admin',
            priority: 'low'
          }
        });
      }

      // Create the message
      const message = await prisma.message.create({
        data: {
          content: content.trim(),
          senderId: 'admin-001', // Admin sender ID
          senderType: 'admin',
          conversationId: conversation.ticketNumber,
          type: 'text'
        }
      });

      // Update conversation's lastMessageAt
      await prisma.conversation.update({
        where: { ticketNumber: conversation.ticketNumber },
        data: {
          lastMessageAt: new Date()
        }
      });

      res.status(201).json({
        message: 'Message sent successfully',
        data: {
          id: message.id,
          content: message.content,
          senderType: message.senderType,
          createdAt: message.createdAt
        }
      });

    } catch (error) {
      console.error('Error sending message to agent:', error);
      res.status(500).json({ 
        message: 'Internal server error',
        error: error.message 
      });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
