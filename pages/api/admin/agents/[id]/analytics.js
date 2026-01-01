import prisma, { ensurePrismaConnected } from '@/lib/prisma';


export default async function handler(req, res) {
  await ensurePrismaConnected();
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ message: 'Agent ID is required' });
    }

    // Try to find agent by slug first, then by id for backward compatibility
    let agent = await prisma.agent.findUnique({
      where: { slug: id },
      select: { id: true, userId: true }
    });

    if (!agent) {
      agent = await prisma.agent.findUnique({
        where: { id },
        select: { id: true, userId: true }
      });
    }

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const now = new Date();

    // Calculate date ranges for the last 4 weeks
    const getWeekStart = (weeksAgo) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (weeksAgo * 7));
      date.setHours(0, 0, 0, 0);
      return date;
    };

    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = getWeekStart(i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      weeks.push({ start: weekStart, end: weekEnd });
    }

    // Get all conversations assigned to this agent
    const agentConversations = await prisma.conversation.findMany({
      where: {
        assigneeId: agent.id
      },
      select: {
        ticketNumber: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Calculate tickets resolved per week
    const weeklyResolved = weeks.map((week, index) => {
      const resolved = agentConversations.filter(conv => {
        // Check if ticket was resolved/closed during this week
        const resolvedDate = conv.status === 'resolved' || conv.status === 'closed'
          ? new Date(conv.updatedAt)
          : null;

        if (!resolvedDate) return false;

        return resolvedDate >= week.start && resolvedDate < week.end;
      }).length;

      return {
        week: `Week ${4 - index}`,
        resolved,
        period: `${week.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(week.end.getTime() - 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      };
    });

    // Calculate tickets with activity per day for last 7 days (created OR updated)
    const dailyTickets = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayTickets = agentConversations.filter(conv => {
        const created = new Date(conv.createdAt);
        const updated = new Date(conv.updatedAt);
        // Count tickets that were created OR updated on this day
        return (created >= day && created < nextDay) || (updated >= day && updated < nextDay);
      }).length;

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      dailyTickets.push({
        day: dayNames[day.getDay()],
        count: dayTickets,
        date: day.toISOString()
      });
    }

    // Calculate performance score per week (based on resolved tickets and response time)
    // For simplicity, we'll use resolved tickets count normalized to 100
    const weeklyPerformance = weeklyResolved.map(week => {
      // Normalize resolved tickets to 0-100 scale
      // Assuming max 50 resolved tickets per week would be 100%
      const maxExpected = 50;
      const score = Math.min(100, (week.resolved / maxExpected) * 100);
      return score;
    });

    res.status(200).json({
      weeklyResolved,
      weeklyPerformance,
      dailyTickets
    });

  } catch (error) {
    console.error('Error fetching agent analytics:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}

