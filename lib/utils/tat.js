/**
 * Calculate Agent TAT (Turnaround Time) based on worklogs
 * TAT is the total time an agent spent working on a ticket
 */
export async function calculateAgentTAT(prisma, ticketNumber) {
  try {
    const worklogs = await prisma.worklog.findMany({
      where: { ticketNumber },
      select: {
        durationSeconds: true,
        startedAt: true,
        endedAt: true
      }
    });

    // Calculate total TAT from all worklogs
    let totalTATSeconds = 0;

    worklogs.forEach(worklog => {
      if (worklog.durationSeconds) {
        // Use stored duration if available
        totalTATSeconds += worklog.durationSeconds;
      } else if (worklog.endedAt) {
        // Calculate from start to end time
        const duration = Math.floor(
          (new Date(worklog.endedAt) - new Date(worklog.startedAt)) / 1000
        );
        totalTATSeconds += duration;
      } else {
        // Active worklog - calculate current duration
        const duration = Math.floor(
          (new Date() - new Date(worklog.startedAt)) / 1000
        );
        totalTATSeconds += duration;
      }
    });

    return totalTATSeconds;
  } catch (error) {
    console.error('Error calculating agent TAT:', error);
    return 0;
  }
}

/**
 * Calculate First Response Time
 * Time from ticket creation to first agent message
 */
export async function calculateFirstResponseTime(prisma, conversationId) {
  try {
    const [conversation, firstAgentMessage] = await Promise.all([
      prisma.conversation.findUnique({
        where: { ticketNumber: conversationId },
        select: { createdAt: true }
      }),
      prisma.message.findFirst({
        where: {
          conversationId,
          senderType: { in: ['agent', 'admin'] } // Treat admin messages as agent responses for TAT
        },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      })
    ]);

    if (!conversation || !firstAgentMessage) {
      return { firstResponseAt: null, firstResponseTimeSeconds: null };
    }

    const firstResponseAt = firstAgentMessage.createdAt;
    const firstResponseTimeSeconds = Math.floor(
      (new Date(firstResponseAt) - new Date(conversation.createdAt)) / 1000
    );

    return { firstResponseAt, firstResponseTimeSeconds };
  } catch (error) {
    console.error('Error calculating first response time:', error);
    return { firstResponseAt: null, firstResponseTimeSeconds: null };
  }
}

/**
 * Calculate Resolution Time
 * Time from ticket creation to resolution
 */
export async function calculateResolutionTime(prisma, conversationId) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { ticketNumber: conversationId },
      select: {
        createdAt: true,
        status: true,
        updatedAt: true
      }
    });

    if (!conversation) {
      return null;
    }

    // Only calculate if ticket is resolved or closed
    if (conversation.status !== 'resolved' && conversation.status !== 'closed') {
      return null;
    }

    // Find when ticket was resolved (from activities)
    const resolutionActivity = await prisma.ticketActivity.findFirst({
      where: {
        conversationId,
        activityType: 'status_changed',
        newValue: { in: ['resolved', 'closed'] }
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true }
    });

    const resolvedAt = resolutionActivity?.createdAt || conversation.updatedAt;
    const resolutionTimeSeconds = Math.floor(
      (new Date(resolvedAt) - new Date(conversation.createdAt)) / 1000
    );

    return resolutionTimeSeconds;
  } catch (error) {
    console.error('Error calculating resolution time:', error);
    return null;
  }
}

/**
 * Update all TAT metrics for a conversation
 */
export async function updateTATMetrics(prisma, ticketNumber) {
  try {
    const [agentTAT, firstResponse, resolutionTime] = await Promise.all([
      calculateAgentTAT(prisma, ticketNumber),
      calculateFirstResponseTime(prisma, ticketNumber),
      calculateResolutionTime(prisma, ticketNumber)
    ]);

    await prisma.conversation.update({
      where: { ticketNumber },
      data: {
        agentTATSeconds: agentTAT > 0 ? agentTAT : null,
        firstResponseAt: firstResponse.firstResponseAt,
        firstResponseTimeSeconds: firstResponse.firstResponseTimeSeconds,
        resolutionTimeSeconds: resolutionTime
      }
    });

    return {
      agentTATSeconds: agentTAT,
      firstResponseAt: firstResponse.firstResponseAt,
      firstResponseTimeSeconds: firstResponse.firstResponseTimeSeconds,
      resolutionTimeSeconds: resolutionTime
    };
  } catch (error) {
    console.error('Error updating TAT metrics:', error);
    return null;
  }
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatTAT(seconds) {
  if (!seconds || seconds < 0) return '0s';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

