import { PrismaClient } from '@prisma/client';
import { getSecuritySettings, getTicketSettings, getFileUploadSettings } from '@/lib/settings';
import { triggerWebhook } from '@/lib/utils/webhooks';
import { getCurrentUserId } from '@/lib/auth';
import { checkPermissionOrFail } from '@/lib/permissions';

// Configure body parser for large payloads (base64 attachments)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Increase body size limit to handle base64 encoded files
    },
  },
};

async function ensureAdminsAsAgents(prisma) {
  try {
    const admins = await prisma.admin.findMany({
      where: {
        email: { not: null }
      }
    });
    if (!admins || admins.length === 0) return;

    for (const admin of admins) {
      if (!admin.email) continue;
      const existingAgent = await prisma.agent.findFirst({
        where: { email: admin.email.toLowerCase() }
      });
      if (existingAgent) continue;

      await prisma.agent.create({
        data: {
          name: admin.name || admin.email.split('@')[0],
          email: admin.email.toLowerCase(),
          slug: `admin-${admin.id}`,
          userId: `ADMIN-${admin.id}`,
          isActive: true,
          presenceStatus: 'online'
        }
      });
    }
  } catch (error) {
    console.error('Failed to ensure admins are available as agents:', error);
  }
}

// Assignment Engine Functions (inline to avoid module resolution issues)
async function getEnabledRules(prisma) {
  return await prisma.assignmentRule.findMany({
    where: { enabled: true },
    orderBy: { priority: 'asc' }
  });
}

async function assignRoundRobin(prisma, conversation, ruleConfig = {}) {
  try {
    const agents = await prisma.agent.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' }
    });
    if (agents.length === 0) return null;
    const lastAssignment = await prisma.assignmentHistory.findFirst({
      where: { ruleType: 'round_robin' },
      orderBy: { assignedAt: 'desc' }
    });
    let nextIndex = 0;
    if (lastAssignment) {
      const lastIndex = agents.findIndex(a => a.id === lastAssignment.assignedToId);
      if (lastIndex >= 0) {
        nextIndex = (lastIndex + 1) % agents.length;
      }
    }
    return agents[nextIndex];
  } catch (error) {
    console.error('Error in round-robin assignment:', error);
    return null;
  }
}

async function assignLoadBased(prisma, conversation, ruleConfig = {}) {
  try {
    const agents = await prisma.agent.findMany({
      where: { isActive: true },
      include: {
        assignedConversations: {
          where: { status: { in: ['open', 'pending'] } }
        }
      }
    });
    if (agents.length === 0) return null;
    const agentsWithLoad = agents.map(agent => ({
      ...agent,
      currentLoad: agent.assignedConversations.length,
      maxLoad: agent.maxLoad || 999
    }));
    const availableAgents = agentsWithLoad.filter(a => a.currentLoad < a.maxLoad);
    if (availableAgents.length === 0) {
      const sorted = agentsWithLoad.sort((a, b) => a.currentLoad - b.currentLoad);
      return sorted[0];
    }
    const sorted = availableAgents.sort((a, b) => a.currentLoad - b.currentLoad);
    return sorted[0];
  } catch (error) {
    console.error('Error in load-based assignment:', error);
    return null;
  }
}

async function assignDepartmentMatch(prisma, conversation, ruleConfig = {}) {
  try {
    const conversationDepartment = conversation.category || 'WZATCO';
    const agents = await prisma.agent.findMany({
      where: { isActive: true, department: conversationDepartment },
      include: {
        assignedConversations: {
          where: { status: { in: ['open', 'pending'] } }
        }
      }
    });
    if (agents.length === 0) {
      const fallbackAgents = await prisma.agent.findMany({
        where: { isActive: true },
        include: {
          assignedConversations: {
            where: { status: { in: ['open', 'pending'] } }
          }
        }
      });
      if (fallbackAgents.length === 0) return null;
      const sorted = fallbackAgents.sort((a, b) => a.assignedConversations.length - b.assignedConversations.length);
      return sorted[0];
    }
    const sorted = agents.sort((a, b) => a.assignedConversations.length - b.assignedConversations.length);
    return sorted[0];
  } catch (error) {
    console.error('Error in department match assignment:', error);
    return null;
  }
}

async function assignSkillMatch(prisma, conversation, ruleConfig = {}) {
  try {
    const conversationCategory = conversation.category || 'WZATCO';
    const agents = await prisma.agent.findMany({
      where: { isActive: true },
      include: {
        assignedConversations: {
          where: { status: { in: ['open', 'pending'] } }
        }
      }
    });
    if (agents.length === 0) return null;
    const matchingAgents = agents.filter(agent => {
      if (!agent.skills) return false;
      try {
        const skills = JSON.parse(agent.skills);
        return Array.isArray(skills) && skills.includes(conversationCategory);
      } catch {
        return false;
      }
    });
    if (matchingAgents.length === 0) {
      const sorted = agents.sort((a, b) => a.assignedConversations.length - b.assignedConversations.length);
      return sorted[0];
    }
    const sorted = matchingAgents.sort((a, b) => a.assignedConversations.length - b.assignedConversations.length);
    return sorted[0];
  } catch (error) {
    console.error('Error in skill match assignment:', error);
    return null;
  }
}

async function assignTicket(prisma, conversationId) {
  try {
    await ensureAdminsAsAgents(prisma);
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    if (conversation.assigneeId) {
      return { assigned: false, reason: 'Already assigned' };
    }
    const rules = await getEnabledRules(prisma);
    if (rules.length === 0) {
      return { assigned: false, reason: 'No assignment rules configured' };
    }
    for (const rule of rules) {
      let assignedAgent = null;
      let config = {};
      try {
        if (rule.config) {
          config = JSON.parse(rule.config);
        }
      } catch {}
      switch (rule.ruleType) {
        case 'round_robin':
          assignedAgent = await assignRoundRobin(prisma, conversation, config);
          break;
        case 'load_based':
          assignedAgent = await assignLoadBased(prisma, conversation, config);
          break;
        case 'department_match':
          assignedAgent = await assignDepartmentMatch(prisma, conversation, config);
          break;
        case 'skill_match':
          assignedAgent = await assignSkillMatch(prisma, conversation, config);
          break;
        default:
          continue;
      }
      if (assignedAgent) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { assigneeId: assignedAgent.id }
        });
        const agentLoad = await prisma.conversation.count({
          where: {
            assigneeId: assignedAgent.id,
            status: { in: ['open', 'pending'] }
          }
        });
        await prisma.assignmentHistory.create({
          data: {
            ruleId: rule.id,
            ruleType: rule.ruleType,
            conversationId: conversationId,
            assignedToId: assignedAgent.id,
            metadata: JSON.stringify({
              agentLoad: agentLoad,
              ruleName: rule.name
            })
          }
        });
        await prisma.ticketActivity.create({
          data: {
            conversationId: conversationId,
            activityType: 'assigned',
            newValue: assignedAgent.id,
            performedBy: 'system',
            performedByName: 'Assignment Engine'
          }
        });
        return {
          assigned: true,
          agentId: assignedAgent.id,
          agentName: assignedAgent.name,
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: rule.ruleType
        };
      }
    }
    return { assigned: false, reason: 'No matching rule found an available agent' };
  } catch (error) {
    console.error('Error in assignTicket:', error);
    throw error;
  }
}

// Customer ID Generator Functions (inline to avoid module resolution issues)
const CATEGORY_CODES = {
  'WZATCO': 'WZ',
  'Technical': 'TEC',
  'Billing': 'BIL',
  'Support': 'SUP',
  'Service': 'SVC',
  'Delivery': 'DEL',
  'Other': 'OTH',
  'default': 'GEN'
};

function getProductCode(productModel) {
  if (!productModel) return 'GEN';
  const cleaned = productModel.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return cleaned.substring(0, 3) || 'GEN';
}

function getCategoryCode(category) {
  if (!category) return CATEGORY_CODES.default;
  const upperCategory = category.toUpperCase();
  return CATEGORY_CODES[upperCategory] || CATEGORY_CODES.default;
}

async function getNextCustomerSequence(prisma, category, productModel, date = new Date()) {
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const yymm = `${year}${month}`;
  const catCode = getCategoryCode(category);
  const prodCode = getProductCode(productModel);
  
  const customers = await prisma.customer.findMany({
    where: {
      id: {
        startsWith: `CUST-${yymm}-${catCode}-${prodCode}-`
      }
    },
    orderBy: {
      id: 'desc'
    },
    take: 1
  });
  
  if (customers.length === 0) {
    return 1;
  }
  
  const lastId = customers[0].id;
  const lastSeq = parseInt(lastId.split('-').pop() || '0', 10);
  return lastSeq + 1;
}

async function generateCustomerId({ category, productModel, createdAt = new Date(), sequence = null, prisma = null }) {
  if (sequence === null && prisma) {
    sequence = await getNextCustomerSequence(prisma, category, productModel, createdAt);
  } else if (sequence === null) {
    sequence = 1;
  }
  
  const year = createdAt.getFullYear().toString().slice(-2);
  const month = String(createdAt.getMonth() + 1).padStart(2, '0');
  const yymm = `${year}${month}`;
  const catCode = getCategoryCode(category);
  const prodCode = getProductCode(productModel);
  const seq = String(sequence).padStart(3, '0');
  
  return `CUST-${yymm}-${catCode}-${prodCode}-${seq}`;
}

// Ticket ID Generator Functions (inline to avoid module resolution issues)
// Priority codes
const PRIORITY_CODES = {
  'low': 'LOW',
  'medium': 'MED',
  'high': 'HIG',
  'default': 'LOW'
};

function getPriorityCode(priority) {
  if (!priority) return PRIORITY_CODES.default;
  const lowerPriority = priority.toLowerCase();
  return PRIORITY_CODES[lowerPriority] || PRIORITY_CODES.default;
}

async function getNextTicketSequence(prisma, date = new Date()) {
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const yymm = `${year}${month}`;
  
  // Find all tickets (conversations) with matching pattern (new format: TKT-YYMM-SEQ)
  const tickets = await prisma.conversation.findMany({
    where: {
      id: {
        startsWith: `TKT-${yymm}-`
      }
    },
    orderBy: {
      id: 'desc'
    }
  });
  
  if (tickets.length === 0) {
    return 1;
  }
  
  // Extract sequence from last ticket ID
  // Handle old formats (TKT-YYMM-CAT-PRI-SEQ, TKT-YYMM-CAT-SEQ) and new format (TKT-YYMM-SEQ)
  let maxSeq = 0;
  tickets.forEach(ticket => {
    const parts = ticket.id.split('-');
    const lastPart = parts[parts.length - 1];
    const seq = parseInt(lastPart || '0', 10);
    if (seq > maxSeq) {
      maxSeq = seq;
    }
  });
  
  return maxSeq + 1;
}

async function generateTicketId({ category, priority, createdAt = new Date(), sequence = null, prisma = null }) {
  if (sequence === null && prisma) {
    sequence = await getNextTicketSequence(prisma, createdAt);
  } else if (sequence === null) {
    sequence = 1;
  }
  
  const year = createdAt.getFullYear().toString().slice(-2);
  const month = String(createdAt.getMonth() + 1).padStart(2, '0');
  const yymm = `${year}${month}`;
  const seq = String(sequence).padStart(3, '0');
  
  // New format: TKT-YYMM-SEQ (clean and simple, no category, priority, or department)
  return `TKT-${yymm}-${seq}`;
}

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Get current user ID from auth token or header
  const userId = getCurrentUserId(req);
  
  if (req.method === 'GET') {
    // Check permission to view tickets
    if (userId) {
      const hasAccess = await checkPermissionOrFail(userId, 'admin.tickets', res);
      if (!hasAccess) return;
    }
    return handleGet(req, res);
  }
  
  if (req.method === 'POST') {
    // Check permission to create tickets
    if (userId) {
      const hasAccess = await checkPermissionOrFail(userId, 'admin.tickets.create', res);
      if (!hasAccess) return;
    }
    return handlePost(req, res);
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}

async function handleGet(req, res) {

  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      priority, 
      assignee, 
      dateRange, 
      search,
      searchType, // 'all', 'mobile', 'email', 'name', 'ticketId', 'product'
      productModel,
      tags,
      agentId
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {};
    
    // Status filter
    if (status && status !== 'all') {
      where.status = status;
    }
    
    // Priority filter
    if (priority && priority !== 'all') {
      where.priority = priority;
    }

    // Assignee filter - enhanced to support agentId
    if (agentId && agentId !== 'all') {
      if (agentId === 'unassigned') {
        where.assigneeId = null;
      } else {
        where.assigneeId = agentId;
      }
    } else if (assignee && assignee !== 'all') {
      if (assignee === 'unassigned') {
        where.assigneeId = null;
      } else {
        // Find agent by name
        const agent = await prisma.agent.findFirst({
          where: { name: { contains: assignee } }
        });
        if (agent) {
          where.assigneeId = agent.id;
        }
      }
    }
    
    // Product/Model filter
    if (productModel && productModel !== 'all') {
      where.productModel = { contains: productModel };
    }
    
    // Tags filter
    if (tags && tags !== 'all') {
      const tagIds = Array.isArray(tags) ? tags : tags.split(',');
      where.tags = {
        some: {
          tagId: { in: tagIds }
        }
      };
    }
    
    // Date range filter
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        where.createdAt = { gte: startDate };
      }
    }
    
    // Enhanced search filter with different search types
    // Note: SQLite contains is case-sensitive, so we search with the original term
    // and handle case-insensitivity in application logic if needed
    if (search && search.trim()) {
      const searchTerm = search.trim();
      
      // Check if search term contains 3+ consecutive alphanumeric characters
      // If so, automatically use 'all' search mode for comprehensive search
      const hasConsecutiveAlphanumeric = /[a-zA-Z0-9]{3,}/.test(searchTerm);
      // If 3+ consecutive alphanumeric characters detected and no specific search type, use 'all'
      // Otherwise, use the provided searchType or default to 'all'
      let searchMode = searchType || 'all';
      if (hasConsecutiveAlphanumeric && (!searchType || searchType === 'all')) {
        searchMode = 'all';
      }
      
      if (searchMode === 'mobile') {
        // Search by customer phone
        const customers = await prisma.customer.findMany({
          where: {
            phone: { contains: searchTerm }
          },
          select: { id: true }
        });
        if (customers.length > 0) {
          where.customerId = { in: customers.map(c => c.id) };
        } else {
          // No matches, return empty result
          where.customerId = { in: [] };
        }
      } else if (searchMode === 'email') {
        // Search by customer email
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
        // Search by customer name
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
        where.OR = orConditions;
      } else if (searchMode === 'ticketId') {
        // Search by ticket ID
        where.id = { contains: searchTerm };
      } else if (searchMode === 'product') {
        // Search by product model
        where.productModel = { contains: searchTerm };
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
          { id: { contains: searchTerm } },
          { customerName: { contains: searchTerm } },
          { productModel: { contains: searchTerm } }
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
        
        where.OR = orConditions;
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
          assignee: true,
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

    // Transform tickets for frontend
    const transformedTickets = await Promise.all(tickets.map(async (ticket) => {
      const lastMessage = ticket.messages[0];
      const timeAgo = Math.floor((Date.now() - new Date(ticket.updatedAt).getTime()) / (1000 * 60));
      const timeString = timeAgo < 60 ? `${timeAgo}m ago` : 
                        timeAgo < 1440 ? `${Math.floor(timeAgo / 60)}h ago` : 
                        `${Math.floor(timeAgo / 1440)}d ago`;

      // Get agent information if message is from an agent
      let agentInfo = null;
      if (lastMessage && lastMessage.senderType === 'agent' && lastMessage.senderId) {
        // Try to find agent by senderId
        const agent = await prisma.agent.findUnique({
          where: { id: lastMessage.senderId },
          select: {
            id: true,
            name: true,
            email: true
          }
        }).catch(() => null);
        
        // If not found by ID, try to use the ticket's assignee as fallback
        if (!agent && ticket.assignee) {
          agentInfo = {
            id: ticket.assignee.id,
            name: ticket.assignee.name,
            email: ticket.assignee.email
          };
        } else if (agent) {
          agentInfo = {
            id: agent.id,
            name: agent.name,
            email: agent.email
          };
        }
      }

      return {
        id: ticket.id,
        subject: ticket.subject || 'No subject',
        status: ticket.status,
        priority: ticket.priority || 'low',
        productModel: ticket.productModel || null,
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
        departmentId: ticket.departmentId,
        tags: ticket.tags?.map(ct => ({
          ...ct.Tag,
          conversationTagId: ct.id,
          status: ct.status // Include status for conditional colors
        })) || [],
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          senderType: lastMessage.senderType,
          createdAt: lastMessage.createdAt,
          agent: agentInfo
        } : null,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        timeAgo: timeString,
        messageCount: ticket._count?.messages ?? 0
      };
    }));

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.status(200).json({
      tickets: transformedTickets,
      totalTickets: totalCount,
      totalPages: totalPages,
      currentPage: parseInt(page)
    });

  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function handlePost(req, res) {
  try {
    const {
      name,
      email,
      phone,
      address,
      subject,
      message,
      productModel, // Deprecated: kept for backward compatibility
      productId, // New: Product ID
      accessoryId, // New: Accessory ID
      category,
      priority = 'low',
      invoice,
      customerId, // Optional: if selecting existing customer
      attachments = []
    } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, email, subject, and message are required' 
      });
    }

    // Check spam email blocklist
    const securitySettings = await getSecuritySettings();
    const emailLower = email.toLowerCase();
    const isBlocked = securitySettings.spamEmailBlocklist.some(blocked => {
      const blockedLower = blocked.toLowerCase();
      // Check if email matches blocked email or domain
      if (blockedLower.startsWith('@')) {
        // Domain blocklist (e.g., @spamdomain.com)
        return emailLower.endsWith(blockedLower);
      } else {
        // Exact email match
        return emailLower === blockedLower;
      }
    });

    if (isBlocked) {
      return res.status(403).json({
        message: 'This email address is blocked from creating tickets.'
      });
    }

    // Check for existing open tickets if customer is provided
    let customer;
    if (customerId) {
      customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }

      // Get ticket settings to check userMaxOpenTickets
      const ticketSettings = await getTicketSettings();
      
      // Check for existing open tickets
      const existingOpenTickets = await prisma.conversation.findMany({
        where: {
          customerId: customer.id,
          status: { in: ['open', 'pending'] }
        },
        include: {
          messages: { take: 1, orderBy: { createdAt: 'desc' } }
        }
      });

      // Check if customer exceeds max open tickets limit
      if (existingOpenTickets.length >= ticketSettings.userMaxOpenTickets) {
        return res.status(409).json({
          message: `You have reached the maximum limit of ${ticketSettings.userMaxOpenTickets} open tickets. Please wait for existing tickets to be resolved before creating a new one.`,
          existingTickets: existingOpenTickets.map(t => ({
            id: t.id,
            subject: t.subject,
            status: t.status,
            createdAt: t.createdAt,
            lastMessage: t.messages[0]?.content
          })),
          maxOpenTickets: ticketSettings.userMaxOpenTickets
        });
      }

      if (existingOpenTickets.length > 0) {
        return res.status(409).json({
          message: 'Customer has existing open tickets',
          existingTickets: existingOpenTickets.map(t => ({
            id: t.id,
            subject: t.subject,
            status: t.status,
            createdAt: t.createdAt,
            lastMessage: t.messages[0]?.content
          }))
        });
      }
    } else {
      // Create or find customer by email
      const existingCustomer = await prisma.customer.findUnique({
        where: { email }
      });

      if (existingCustomer) {
        // Check max open tickets limit for existing customer
        const existingOpenTickets = await prisma.conversation.findMany({
          where: {
            customerId: existingCustomer.id,
            status: { in: ['open', 'pending'] }
          }
        });

        if (existingOpenTickets.length >= ticketSettings.userMaxOpenTickets) {
          return res.status(409).json({
            message: `You have reached the maximum limit of ${ticketSettings.userMaxOpenTickets} open tickets. Please wait for existing tickets to be resolved before creating a new one.`,
            existingTickets: existingOpenTickets.map(t => ({
              id: t.id,
              subject: t.subject,
              status: t.status,
              createdAt: t.createdAt
            })),
            maxOpenTickets: ticketSettings.userMaxOpenTickets
          });
        }

        // Update existing customer
        customer = await prisma.customer.update({
          where: { email },
          data: {
            name,
            phone: phone || undefined,
            location: address || undefined
          }
        });
      } else {
        // Create new customer with formatted ID
        try {
          const now = new Date();
          const customerId = await generateCustomerId({
            category: category || 'WZATCO',
            productModel: productModel || undefined,
            createdAt: now,
            prisma
          });

          customer = await prisma.customer.create({
            data: {
              id: customerId,
              name,
              email,
              phone: phone || undefined,
              location: address || undefined
            }
          });
        } catch (customerError) {
          console.error('Error generating customer ID or creating customer:', customerError);
          // Fallback: create customer with auto-generated ID if ID generation fails
          customer = await prisma.customer.create({
            data: {
              name,
              email,
              phone: phone || undefined,
              location: address || undefined
            }
          });
        }
      }
    }

    // Create conversation (ticket) with formatted ID
    let conversation;
    try {
      const now = new Date();
      const ticketId = await generateTicketId({
        category: category || 'WZATCO',
        priority: priority || 'low',
        createdAt: now,
        prisma
      });

      conversation = await prisma.conversation.create({
        data: {
          id: ticketId,
          siteId: 'default',
          status: 'open',
          subject,
          customerId: customer.id,
          customerName: customer.name,
          category: category || 'WZATCO',
          priority,
          productModel: productModel || undefined, // Keep for backward compatibility
          productId: productId || undefined,
          accessoryId: accessoryId || undefined
        }
      });
    } catch (ticketIdError) {
      console.error('Error generating ticket ID or creating ticket:', ticketIdError);
      // Fallback: create ticket with auto-generated ID if ID generation fails
      conversation = await prisma.conversation.create({
        data: {
          siteId: 'default',
          status: 'open',
          subject,
          customerId: customer.id,
          customerName: customer.name,
          category: category || 'WZATCO',
          priority,
          productModel: productModel || undefined, // Keep for backward compatibility
          productId: productId || undefined,
          accessoryId: accessoryId || undefined
        }
      });
    }

    // Create initial message
    const messageData = {
      conversationId: conversation.id,
      senderType: 'admin',
      senderId: 'admin',
      content: message,
      type: 'text',
      metadata: invoice ? { invoice } : undefined
    };

    const createdMessage = await prisma.message.create({
      data: messageData
    });

    // Handle attachments if provided (base64 encoded files)
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(process.cwd(), 'uploads', 'tickets', conversation.id);
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Get file upload settings for validation
      const fileUploadSettings = await getFileUploadSettings();
      const maxSizeBytes = fileUploadSettings.maxUploadSize * 1024 * 1024;
      const allowedTypes = fileUploadSettings.allowedFileTypes;

      for (const attachment of attachments) {
        if (attachment.base64 && attachment.filename && attachment.mimeType) {
          try {
            const base64Data = attachment.base64.split(',')[1] || attachment.base64;
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Validate file size
            if (buffer.length > maxSizeBytes) {
              console.error(`File ${attachment.filename} exceeds max size of ${fileUploadSettings.maxUploadSize}MB`);
              continue; // Skip this file
            }
            
            // Validate file type if allowed types are configured
            if (allowedTypes.length > 0 && !allowedTypes.includes(attachment.mimeType)) {
              console.error(`File ${attachment.filename} type ${attachment.mimeType} is not allowed`);
              continue; // Skip this file
            }
            
            const filename = `${Date.now()}_${attachment.filename}`;
            const filePath = path.join(uploadsDir, filename);
            
            fs.writeFileSync(filePath, buffer);
            const fileUrl = `/api/uploads/tickets/${conversation.id}/${filename}`;

            await prisma.attachment.create({
              data: {
                messageId: createdMessage.id,
                url: fileUrl,
                filename: attachment.filename,
                mimeType: attachment.mimeType,
                size: buffer.length
              }
            });
          } catch (err) {
            console.error('Error saving attachment:', err);
            // Continue even if attachment fails
          }
        }
      }
    }

    // Update conversation's lastMessageAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() }
    });

    // Try to auto-assign ticket using assignment rules
    let assignmentResult = null;
    try {
      assignmentResult = await assignTicket(prisma, conversation.id);
    } catch (assignmentError) {
      // Log error but don't fail ticket creation if assignment fails
      console.error('Error auto-assigning ticket:', assignmentError);
    }

    // Fetch updated conversation with assignee if assigned
    const updatedConversation = await prisma.conversation.findUnique({
      where: { id: conversation.id },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Send email notifications
    try {
      const { notifyTicketCreatedCustomer, notifyTicketCreated } = await import('@/lib/utils/notifications');
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const ticketLink = `${baseUrl}/ticket/${conversation.id}`;

      // Send email to customer
      if (customer.email) {
        notifyTicketCreatedCustomer(prisma, {
          ticketId: conversation.id,
          ticketSubject: conversation.subject,
          customerEmail: customer.email,
          customerName: customer.name,
          priority: conversation.priority || 'low',
          ticketLink,
          sendEmail: true
        }).catch(error => {
          console.error('Error sending ticket created email to customer:', error);
        });
      }

      // Send email to admins
      notifyTicketCreated(prisma, {
        ticketId: conversation.id,
        ticketSubject: conversation.subject,
        customerName: customer.name,
        priority: conversation.priority || 'low',
        ticketLink: `${baseUrl}/admin/tickets/${conversation.id}`,
        sendEmail: true
      }).catch(error => {
        console.error('Error sending ticket created email to admins:', error);
      });
    } catch (notifError) {
      console.error('Error sending ticket creation notifications:', notifError);
      // Don't fail ticket creation if notifications fail
    }

    // Trigger webhook for ticket creation
    try {
      await triggerWebhook('ticket.created', {
        ticket: {
          id: updatedConversation.id,
          subject: updatedConversation.subject,
          status: updatedConversation.status,
          priority: updatedConversation.priority,
          category: updatedConversation.category,
          customerId: updatedConversation.customerId,
          customerName: updatedConversation.customerName,
          assigneeId: updatedConversation.assigneeId,
          assignee: updatedConversation.assignee,
          departmentId: updatedConversation.departmentId,
          createdAt: updatedConversation.createdAt
        },
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email
        }
      });
    } catch (webhookError) {
      console.error('Error triggering webhook for ticket creation:', webhookError);
      // Don't fail ticket creation if webhook fails
    }

    res.status(201).json({
      message: 'Ticket created successfully',
      ticket: {
        id: updatedConversation.id,
        subject: updatedConversation.subject,
        status: updatedConversation.status,
        priority: updatedConversation.priority,
        assignee: updatedConversation.assignee,
        assignmentResult: assignmentResult,
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email
        },
        createdAt: updatedConversation.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating ticket:', error);
    console.error('Error stack:', error.stack);
    
    // Ensure we return JSON, not HTML
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Internal server error',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}
