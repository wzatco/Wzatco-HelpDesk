import prisma, { ensurePrismaConnected } from '@/lib/prisma';


export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(200).json({ 
        tickets: [],
        agents: [],
        articles: []
      });
    }

    const searchTerm = q.trim().toLowerCase();
    const results = {
      tickets: [],
      agents: [],
      articles: []
    };

    // Search Tickets
    try {
      let tickets = [];
      const searchTermUpper = q.trim().toUpperCase();
      
      // First, check if search term looks like a ticket ID (contains "TKT-" or is alphanumeric)
      const looksLikeTicketId = /^TKT-/.test(searchTermUpper) || /^[A-Z0-9-]+$/.test(searchTermUpper);
      
      // If it looks like a ticket ID, try direct lookup first
      if (looksLikeTicketId) {
        try {
          const directTicket = await prisma.conversation.findUnique({
            where: { ticketNumber: q.trim() },
            include: {
              customer: {
                select: {
                  email: true,
                  phone: true
                }
              },
              assignee: {
                select: {
                  name: true,
                  email: true
                }
              },
              _count: {
                select: {
                  messages: true
                }
              }
            }
          });
          
          if (directTicket) {
            tickets.push(directTicket);
          }
        } catch (error) {
          // If direct lookup fails, continue with general search
          console.error('Error in direct ticket lookup:', error);
        }
      }
      
      // Also do general search for subject, customer name, and partial ID matches
      // SQLite doesn't support case-insensitive mode, so we fetch and filter
      const allTickets = await prisma.conversation.findMany({
        take: 100, // Increased to get more results
        include: {
          customer: {
            select: {
              email: true,
              phone: true
            }
          },
          assignee: {
            select: {
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              messages: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      // Filter case-insensitively and avoid duplicates
      const existingIds = new Set(tickets.map(t => t.ticketNumber));
      const filteredTickets = allTickets.filter(ticket => {
        // Skip if already found by direct lookup
        if (existingIds.has(ticket.ticketNumber)) return false;
        
        const subject = (ticket.subject || '').toLowerCase();
        const customerName = (ticket.customerName || '').toLowerCase();
        const ticketNum = (ticket.ticketNumber || '').toLowerCase();
        return subject.includes(searchTerm) || customerName.includes(searchTerm) || ticketNum.includes(searchTerm);
      });
      
      // Combine direct lookup results with filtered results, limit to 10
      tickets = [...tickets, ...filteredTickets].slice(0, 10);

      results.tickets = tickets.map(ticket => ({
        id: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        customerName: ticket.customerName,
        assignee: ticket.assignee ? {
          name: ticket.assignee.name,
          email: ticket.assignee.email
        } : null,
        messageCount: ticket._count.messages,
        updatedAt: ticket.updatedAt,
        createdAt: ticket.createdAt
      }));
    } catch (error) {
      console.error('Error searching tickets:', error);
    }

    // Search Agents
    try {
      // SQLite doesn't support case-insensitive mode, so we fetch and filter
      const allAgents = await prisma.agent.findMany({
        take: 50, // Get more to filter client-side
        select: {
          id: true,
          name: true,
          email: true,
          userId: true,
          department: {
            select: {
              name: true
            }
          },
          presenceStatus: true,
          isActive: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      // Filter case-insensitively
      const agents = allAgents.filter(agent => {
        const name = (agent.name || '').toLowerCase();
        const email = (agent.email || '').toLowerCase();
        const userId = (agent.userId || '').toLowerCase();
        return name.includes(searchTerm) || email.includes(searchTerm) || userId.includes(searchTerm);
      }).slice(0, 10);

      results.agents = agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        email: agent.email,
        userId: agent.userId,
        department: agent.department?.name || null,
        presenceStatus: agent.presenceStatus || 'offline',
        isActive: agent.isActive
      }));
    } catch (error) {
      console.error('Error searching agents:', error);
    }

    // Search Articles (Knowledge Base) - Placeholder for future implementation
    // TODO: Implement when knowledge base is added
    results.articles = [];

    res.status(200).json(results);

  } catch (error) {
    console.error('Error in unified search:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}

