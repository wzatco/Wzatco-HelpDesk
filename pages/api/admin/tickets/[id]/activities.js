import prisma, { ensurePrismaConnected } from '../../../../../lib/prisma';

export default async function handler(req, res) {
  // Ensure Prisma is connected before proceeding
  await ensurePrismaConnected();
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      // First verify the conversation exists
      const conversation = await prisma.conversation.findUnique({
        where: { ticketNumber: id },
        select: { ticketNumber: true }
      });

      if (!conversation) {
        return res.status(404).json({ 
          message: 'Ticket not found',
          activities: []
        });
      }

      // Fetch activities for this ticket, ordered by most recent first
      const activities = await prisma.ticketActivity.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'desc' },
        take: 50, // Limit to last 50 activities
        include: {
          Conversation: {
            select: {
              assigneeId: true,
              assignee: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      // Enhance activities with agent information
      const enhancedActivities = await Promise.all(activities.map(async (activity) => {
        let agentInfo = null;
        
        // If performedBy is 'agent', try to find the agent
        if (activity.performedBy === 'agent') {
          // First check if performedByName exists
          if (activity.performedByName) {
            // Try to find agent by name
            const agent = await prisma.agent.findFirst({
              where: { name: activity.performedByName },
              select: {
                id: true,
                name: true,
                email: true
              }
            });
            if (agent) {
              agentInfo = agent;
            }
          }
          
          // If no agent found by name, check if conversation has an assignee
          if (!agentInfo && activity.Conversation?.assignee) {
            agentInfo = activity.Conversation.assignee;
          }
        }
        
        return {
          ...activity,
          agent: agentInfo
        };
      }));

      return res.status(200).json({ activities: enhancedActivities });
    } catch (error) {
      console.error('Error fetching ticket activities:', error);
      return res.status(500).json({ 
        message: 'Error fetching ticket activities', 
        error: error.message 
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}

