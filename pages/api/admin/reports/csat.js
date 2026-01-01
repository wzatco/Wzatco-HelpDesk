import { PrismaClient } from '@prisma/client';

// Prisma singleton pattern
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

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
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Start of day
        dateFilter.submittedAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of day
        dateFilter.submittedAt.lte = end;
      }
    }

    // Get all feedbacks
    const feedbacks = await prisma.feedback.findMany({
      where: dateFilter,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        Conversation: {
          select: {
            ticketNumber: true,
            subject: true,
            assigneeId: true
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

    // Agent-wise CSAT (using agent relation from Feedback - Resolver Takes Credit)
    const agentCSAT = {};
    feedbacks.forEach(feedback => {
      const agentId = feedback.agentId;
      const agentName = feedback.agent?.name || 'Unassigned';
      const department = feedback.agent?.department?.name || 'N/A';
      
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

    // Department-wise CSAT (using agent relation from Feedback)
    const departmentCSAT = {};
    feedbacks.forEach(feedback => {
      const department = feedback.agent?.department?.name || 'Unassigned';
      
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

    // Recent feedback list (last 5 records)
    const recentFeedbacks = feedbacks.slice(0, 5).map(feedback => ({
      id: feedback.id,
      ticketId: feedback.conversationId,
      rating: feedback.rating,
      comment: feedback.comment,
      customerName: feedback.customerName || 'Anonymous',
      agentName: feedback.agent?.name || 'Unassigned',
      department: feedback.agent?.department?.name || 'N/A',
      submittedAt: feedback.submittedAt,
      subject: feedback.Conversation?.subject || 'N/A'
    }));

    // Always return a valid structure, even with 0 feedbacks
    const response = {
      success: true,
      data: {
        summary: {
          totalFeedbacks: totalFeedbacks || 0,
          averageRating: averageRating || 0,
          csatScore: csatScore || 0,
          ratingDistribution: ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        },
        agentMetrics: agentMetrics || [],
        departmentMetrics: departmentMetrics || [],
        recentFeedbacks: recentFeedbacks || [] // Last 5 recent feedbacks
      }
    };

    console.log('📊 CSAT API Response:', {
      totalFeedbacks,
      averageRating,
      csatScore,
      recentCount: recentFeedbacks.length
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching CSAT report:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching CSAT report',
      error: error.message 
    });
  }
}

