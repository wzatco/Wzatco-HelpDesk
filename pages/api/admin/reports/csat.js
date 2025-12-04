import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.submittedAt = {};
      if (startDate) {
        dateFilter.submittedAt.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.submittedAt.lte = new Date(endDate);
      }
    }

    // Get all feedbacks
    const feedbacks = await prisma.feedback.findMany({
      where: dateFilter,
      include: {
        Conversation: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                department: true
              }
            }
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    // Calculate overall CSAT metrics
    const totalFeedbacks = feedbacks.length;
    const ratings = feedbacks.map(f => f.rating);
    const averageRating = totalFeedbacks > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / totalFeedbacks) * 100) / 100
      : 0;
    
    // Rating distribution
    const ratingDistribution = {
      5: ratings.filter(r => r === 5).length,
      4: ratings.filter(r => r === 4).length,
      3: ratings.filter(r => r === 3).length,
      2: ratings.filter(r => r === 2).length,
      1: ratings.filter(r => r === 1).length
    };

    // CSAT Score (percentage of 4 and 5 ratings)
    const positiveRatings = ratingDistribution[5] + ratingDistribution[4];
    const csatScore = totalFeedbacks > 0
      ? Math.round((positiveRatings / totalFeedbacks) * 100)
      : 0;

    // Agent-wise CSAT
    const agentCSAT = {};
    feedbacks.forEach(feedback => {
      const agentId = feedback.Conversation?.assigneeId;
      const agentName = feedback.Conversation?.assignee?.name || 'Unassigned';
      const department = feedback.Conversation?.assignee?.department || 'N/A';
      
      if (!agentCSAT[agentId || 'unassigned']) {
        agentCSAT[agentId || 'unassigned'] = {
          agentId: agentId || null,
          agentName,
          department,
          totalFeedbacks: 0,
          ratings: [],
          averageRating: 0,
          csatScore: 0
        };
      }
      
      agentCSAT[agentId || 'unassigned'].totalFeedbacks++;
      agentCSAT[agentId || 'unassigned'].ratings.push(feedback.rating);
    });

    // Calculate agent metrics
    const agentMetrics = Object.values(agentCSAT).map(agent => {
      const avgRating = agent.ratings.length > 0
        ? Math.round((agent.ratings.reduce((sum, r) => sum + r, 0) / agent.ratings.length) * 100) / 100
        : 0;
      const positiveCount = agent.ratings.filter(r => r >= 4).length;
      const csat = agent.ratings.length > 0
        ? Math.round((positiveCount / agent.ratings.length) * 100)
        : 0;
      
      return {
        ...agent,
        averageRating: avgRating,
        csatScore: csat,
        ratings: undefined // Remove ratings array from response
      };
    });

    // Department-wise CSAT
    const departmentCSAT = {};
    feedbacks.forEach(feedback => {
      const department = feedback.Conversation?.assignee?.department || 'Unassigned';
      
      if (!departmentCSAT[department]) {
        departmentCSAT[department] = {
          department,
          totalFeedbacks: 0,
          ratings: [],
          averageRating: 0,
          csatScore: 0
        };
      }
      
      departmentCSAT[department].totalFeedbacks++;
      departmentCSAT[department].ratings.push(feedback.rating);
    });

    // Calculate department metrics
    const departmentMetrics = Object.values(departmentCSAT).map(dept => {
      const avgRating = dept.ratings.length > 0
        ? Math.round((dept.ratings.reduce((sum, r) => sum + r, 0) / dept.ratings.length) * 100) / 100
        : 0;
      const positiveCount = dept.ratings.filter(r => r >= 4).length;
      const csat = dept.ratings.length > 0
        ? Math.round((positiveCount / dept.ratings.length) * 100)
        : 0;
      
      return {
        department: dept.department,
        totalFeedbacks: dept.totalFeedbacks,
        averageRating: avgRating,
        csatScore: csat
      };
    });

    // Detailed feedback list
    const detailedFeedbacks = feedbacks.map(feedback => ({
      id: feedback.id,
      ticketId: feedback.conversationId,
      rating: feedback.rating,
      comment: feedback.comment,
      customerName: feedback.customerName || 'Anonymous',
      agentName: feedback.Conversation?.assignee?.name || 'Unassigned',
      department: feedback.Conversation?.assignee?.department || 'N/A',
      submittedAt: feedback.submittedAt,
      subject: feedback.Conversation?.subject || 'N/A'
    }));

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalFeedbacks,
          averageRating,
          csatScore,
          ratingDistribution
        },
        agentMetrics,
        departmentMetrics,
        detailedFeedbacks: detailedFeedbacks.slice(0, 100) // Limit to 100 most recent
      }
    });
  } catch (error) {
    console.error('Error fetching CSAT report:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching CSAT report',
      error: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}

