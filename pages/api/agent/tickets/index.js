import prisma from '../../../../lib/prisma';
import { getCurrentAgentId } from '../../../../lib/utils/agent-auth';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req, res) {
  try {
    const agentId = await getCurrentAgentId(req);
    
    if (!agentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get agent info to check departments
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        department: true
      }
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { 
      page = 1, 
      limit = 20, 
      status, 
      priority, 
      departmentId,
      search,
      searchType,
      needReply, // 'true' to filter tickets that need reply
      view = 'assigned', // 'assigned' or 'unassigned' or 'all' or 'claimable'
      showAll = 'false' // 'true' to show resolved/closed tickets
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {};
    
    // Check if search is present - if so, enable global search (bypass view filters)
    const isGlobalSearch = search && search.trim();
    
    // Feature 1: Hide resolved/closed tickets by default (unless explicitly requested)
    const hideResolvedClosed = showAll !== 'true' && !status; // Don't hide if specific status is selected
    if (hideResolvedClosed) {
      where.status = { notIn: ['resolved', 'closed'] };
    }
    
    // View filter: assigned, unassigned, claimable, or all
    // IMPORTANT: Skip view filter restrictions when doing global search
    if (!isGlobalSearch) {
      // Normal view filter logic (restricted to agent's tickets)
      if (view === 'assigned') {
        where.assigneeId = agentId;
        // Show ALL assigned tickets (including closed/resolved)
      } else if (view === 'unassigned') {
        where.assigneeId = null;
        // Only show unassigned tickets from agent's department
        if (agent.departmentId) {
          where.departmentId = agent.departmentId;
        }
        // Don't show closed/resolved in unassigned pool
        where.status = { notIn: ['closed', 'resolved'] };
      } else if (view === 'claimable') {
        // Filter for claimable tickets (available to claim)
        where.assigneeId = null;
        where.isClaimable = true;
        // Only show active claimable tickets
        where.status = { notIn: ['closed', 'resolved'] };
        // Show claimable tickets from agent's department OR tickets with no department
        // This ensures all agents in the same department can see claimable tickets
        // Note: We use OR here, but search filters will merge it properly using AND
        if (agent.departmentId) {
          // Agent has a department: show tickets from their department OR tickets with no department
          where.OR = [
            { departmentId: agent.departmentId },
            { departmentId: null }
          ];
        } else {
          // Agent has no department: only show tickets with no department
          where.departmentId = null;
        }
      } else {
        // 'all' - show both assigned to agent and unassigned from agent's department
        where.OR = [
          { assigneeId: agentId }, // All assigned tickets (including closed/resolved)
          {
            assigneeId: null,
            status: { notIn: ['closed', 'resolved'] }, // Only active unassigned
            ...(agent.departmentId ? { departmentId: agent.departmentId } : {})
          }
        ];
      }
    }
    // When isGlobalSearch is true, we skip all assigneeId/department restrictions
    // This allows agents to search across ALL tickets in the system
    
    // Status filter
    if (status && status !== 'all') {
      where.status = status;
    }
    
    // Priority filter
    if (priority && priority !== 'all') {
      where.priority = priority;
    }

    // Department filter (only for unassigned tickets or when explicitly filtered)
    // Don't filter by department for assigned tickets - agent should see ALL assigned tickets
    if (departmentId && departmentId !== 'all') {
      if (departmentId === agent.departmentId) {
        where.departmentId = departmentId;
      } else {
        // Agent can only see their own department
        where.departmentId = agent.departmentId;
      }
    }
    // NOTE: We do NOT add a default department filter here because:
    // 1. Assigned tickets should be visible regardless of department
    // 2. The unassigned pool already has department filter in the OR clause above
    
    // Need Reply filter - tickets where customer has replied but no agent/admin has replied
    // IMPORTANT: Only show ACTIVE tickets (exclude resolved/closed)
    // NOTE: Skip needReply filter restrictions when doing global search
    if (needReply === 'true' && !isGlobalSearch) {
      // Build a simple where clause for finding tickets that need reply
      const needReplyWhere = {};
      
      // ALWAYS exclude resolved and closed tickets from need reply
      needReplyWhere.status = { notIn: ['closed', 'resolved'] };
      
      // Apply same view filter
      if (view === 'assigned') {
        needReplyWhere.assigneeId = agentId;
      } else if (view === 'unassigned') {
        needReplyWhere.assigneeId = null;
        if (agent.departmentId) {
          needReplyWhere.departmentId = agent.departmentId;
        }
      } else {
        needReplyWhere.OR = [
          { assigneeId: agentId },
          {
            assigneeId: null,
            ...(agent.departmentId ? { departmentId: agent.departmentId } : {})
          }
        ];
      }
      
      // Apply priority filter if exists (status filter is already handled above)
      if (priority && priority !== 'all') {
        needReplyWhere.priority = priority;
      }
      
      // Get tickets and check last message
      const ticketsNeedingReply = await prisma.conversation.findMany({
        where: needReplyWhere,
        select: {
          ticketNumber: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { senderType: true }
          }
        }
      });
      
      const ticketNumbersNeedingReply = ticketsNeedingReply
        .filter(ticket => {
          // If no messages, it's a new ticket (needs reply)
          if (!ticket.messages || ticket.messages.length === 0) {
            return true;
          }
          // If last message is from customer, needs reply
          const lastMessage = ticket.messages[0];
          return lastMessage && lastMessage.senderType === 'customer';
        })
        .map(ticket => ticket.ticketNumber);
      
      if (ticketNumbersNeedingReply.length > 0) {
        // Override where clause to only include tickets that need reply
        where.ticketNumber = { in: ticketNumbersNeedingReply };
      } else {
        // No tickets need reply, return empty result
        where.ticketNumber = { in: [] };
      }
    }
    
    // Search filter
    if (search && search.trim()) {
      const searchTerm = search.trim();
      const searchMode = searchType || 'all';
      
      if (searchMode === 'mobile') {
        const customers = await prisma.customer.findMany({
          where: {
            phone: { contains: searchTerm }
          },
          select: { id: true }
        });
        if (customers.length > 0) {
          where.customerId = { in: customers.map(c => c.id) };
        } else {
          where.customerId = { in: [] };
        }
      } else if (searchMode === 'email') {
        const customers = await prisma.customer.findMany({
          where: {
            email: { contains: searchTerm }
          },
          select: { id: true }
        });
        if (customers.length > 0) {
          where.customerId = { in: customers.map(c => c.id) };
        } else {
          where.customerId = { in: [] };
        }
      } else if (searchMode === 'name') {
        const customers = await prisma.customer.findMany({
          where: {
            name: { contains: searchTerm }
          },
          select: { id: true }
        });
        const orConditions = [
          { customerName: { contains: searchTerm } }
        ];
        if (customers.length > 0) {
          orConditions.push({ customerId: { in: customers.map(c => c.id) } });
        }
        where.OR = where.OR ? [...(Array.isArray(where.OR) ? where.OR : [where.OR]), ...orConditions] : orConditions;
      } else if (searchMode === 'ticketId') {
        where.ticketNumber = { contains: searchTerm };
      } else {
        // Default: search in all fields
        const customers = await prisma.customer.findMany({
          where: {
            OR: [
              { name: { contains: searchTerm } },
              { email: { contains: searchTerm } },
              { phone: { contains: searchTerm } }
            ]
          },
          select: { id: true }
        });
        
        const orConditions = [
          { subject: { contains: searchTerm } },
          { ticketNumber: { contains: searchTerm } },
          { customerName: { contains: searchTerm } }
        ];
        
        if (customers.length > 0) {
          orConditions.push({ customerId: { in: customers.map(c => c.id) } });
        }
        
        orConditions.push({
          messages: {
            some: {
              content: { contains: searchTerm }
            }
          }
        });
        
        // Merge with existing OR conditions
        if (where.OR) {
          where.AND = [
            { OR: Array.isArray(where.OR) ? where.OR : [where.OR] },
            { OR: orConditions }
          ];
          delete where.OR;
        } else {
          where.OR = orConditions;
        }
      }
    }

    // Fetch tickets with related data
    const [tickets, totalCount] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          department: {
            select: {
              id: true,
              name: true
            }
          },
          tags: {
            include: {
              Tag: true
            }
          },
          _count: { select: { messages: true } }
        }
      }),
      prisma.conversation.count({ where })
    ]);

    // Fetch previous owners for all tickets that have previousOwnerId
    const previousOwnerIds = [...new Set(tickets.filter(t => t.previousOwnerId).map(t => t.previousOwnerId))];
    const previousOwners = previousOwnerIds.length > 0 
      ? await prisma.agent.findMany({
          where: { id: { in: previousOwnerIds } },
          select: { id: true, name: true, email: true }
        }).catch(() => [])
      : [];
    const previousOwnerMap = new Map(previousOwners.map(po => [po.id, po]));

    // Transform tickets for frontend
    const transformedTickets = tickets.map((ticket) => {
      const lastMessage = ticket.messages[0];
      
      // Calculate time ago
      const timeAgo = ticket.updatedAt 
        ? (() => {
            const diff = Date.now() - new Date(ticket.updatedAt).getTime();
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            if (days > 0) return `${days}d ago`;
            if (hours > 0) return `${hours}h ago`;
            if (minutes > 0) return `${minutes}m ago`;
            return 'Just now';
          })()
        : 'N/A';

      return {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject || 'No subject',
        status: ticket.status,
        priority: ticket.priority || 'low',
        customerName: ticket.customerName || ticket.customer?.name || null,
        assignee: ticket.assignee ? {
          id: ticket.assignee.id,
          name: ticket.assignee.name,
          email: ticket.assignee.email
        } : null,
        department: ticket.department ? {
          id: ticket.department.id,
          name: ticket.department.name
        } : null,
        tags: ticket.tags?.map(ct => ({
          ...ct.Tag,
          conversationTagId: ct.id,
          status: ct.status
        })) || [],
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          senderType: lastMessage.senderType,
          createdAt: lastMessage.createdAt
        } : null,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        timeAgo: timeAgo,
        messageCount: ticket._count?.messages ?? 0,
        isAssigned: ticket.assigneeId === agentId,
        isUnassigned: ticket.assigneeId === null,
        isClaimable: ticket.isClaimable || false,
        unassignedReason: ticket.unassignedReason || null,
        previousOwner: ticket.previousOwnerId ? previousOwnerMap.get(ticket.previousOwnerId) || null : null,
        // Add flag to indicate if this ticket belongs to another agent (for search results)
        belongsToOtherAgent: ticket.assigneeId !== null && ticket.assigneeId !== agentId
      };
    });

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.status(200).json({
      success: true,
      tickets: transformedTickets,
      totalTickets: totalCount,
      totalPages: totalPages,
      currentPage: parseInt(page)
    });

  } catch (error) {
    console.error('Error fetching agent tickets:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
}

