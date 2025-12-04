import { PrismaClient } from '@prisma/client';
import { generateSlug, generateUniqueSlug } from '../../../../lib/utils/slug';
import { getCurrentUserId } from '@/lib/auth';
import { checkPermissionOrFail } from '@/lib/permissions';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const userId = getCurrentUserId(req);
  
  if (req.method === 'GET') {
    // Check permission to view agents
    if (userId) {
      const hasAccess = await checkPermissionOrFail(userId, 'admin.agents', res);
      if (!hasAccess) return;
    }
    try {
      // Fetch agents with their related data
      // Try with account relation first, fall back without it if it fails
      let agents;
      let includeAccount = true;
      
      try {
        agents = await prisma.agent.findMany({
          include: {
            department: {
              select: {
                id: true,
                name: true,
                isActive: true
              }
            },
            role: {
              select: {
                id: true,
                title: true,
                displayAs: true,
                hasSuperPower: true
              }
            },
            account: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true,
                type: true,
                roleId: true,
                role: {
                  select: {
                    id: true,
                    title: true,
                    displayAs: true,
                    hasSuperPower: true
                  }
                }
              }
            },
            assignedConversations: {
              select: {
                id: true,
                status: true,
                updatedAt: true,
                lastMessageAt: true,
                messages: {
                  where: {
                    senderType: 'agent'
                  },
                  select: {
                    createdAt: true,
                    senderId: true
                  },
                  orderBy: {
                    createdAt: 'desc'
                  }
                }
              }
            },
            _count: {
              select: {
                assignedConversations: true
              }
            }
          },
          orderBy: {
            name: 'asc'
          }
        });
      } catch (accountError) {
        // If accountId column doesn't exist, fetch without account relation
        if (accountError.message && accountError.message.includes('accountId')) {
          console.warn('Warning: accountId column not found, fetching agents without account relation');
          includeAccount = false;
          
          agents = await prisma.agent.findMany({
            include: {
              department: {
                select: {
                  id: true,
                  name: true,
                  isActive: true
                }
              },
              role: {
                select: {
                  id: true,
                  title: true,
                  displayAs: true,
                  hasSuperPower: true
                }
              },
              assignedConversations: {
                select: {
                  id: true,
                  status: true,
                  updatedAt: true,
                  lastMessageAt: true,
                  messages: {
                    where: {
                      senderType: 'agent'
                    },
                    select: {
                      createdAt: true,
                      senderId: true
                    },
                    orderBy: {
                      createdAt: 'desc'
                    }
                  }
                }
              },
              _count: {
                select: {
                  assignedConversations: true
                }
              }
            },
            orderBy: {
              name: 'asc'
            }
          });
        } else {
          throw accountError;
        }
      }

      // Calculate real performance metrics for each agent
      const transformedAgents = await Promise.all(agents.map(async (agent) => {
        const assignedConversations = agent.assignedConversations || [];
        
        // Calculate tickets resolved (closed or resolved status)
        const resolvedTickets = assignedConversations.filter(
          conv => conv.status === 'resolved' || conv.status === 'closed'
        ).length;

        // Get all conversations assigned to this agent
        const conversationIds = assignedConversations.map(c => c.id);

        // Get all agent messages in these conversations
        const agentMessages = conversationIds.length > 0 ? await prisma.message.findMany({
          where: {
            conversationId: { in: conversationIds },
            senderType: 'agent',
            senderId: agent.userId || agent.id
          },
          select: {
            id: true,
            conversationId: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }) : [];

        // Calculate average response time (in minutes)
        // Optimize by getting all customer messages at once
        let totalResponseTime = 0;
        let responseCount = 0;
        
        if (agentMessages.length > 0 && conversationIds.length > 0) {
          // Get all customer messages for these conversations in one query
          const allCustomerMessages = await prisma.message.findMany({
            where: {
              conversationId: { in: conversationIds },
              senderType: 'customer'
            },
            select: {
              id: true,
              conversationId: true,
              createdAt: true
            },
            orderBy: {
              createdAt: 'asc'
            }
          });

          // Group customer messages by conversation
          const customerMessagesByConv = {};
          allCustomerMessages.forEach(msg => {
            if (!customerMessagesByConv[msg.conversationId]) {
              customerMessagesByConv[msg.conversationId] = [];
            }
            customerMessagesByConv[msg.conversationId].push(msg);
          });

          // For each agent message, find the preceding customer message
          for (const agentMsg of agentMessages) {
            const customerMessages = customerMessagesByConv[agentMsg.conversationId] || [];
            // Find the most recent customer message before this agent message
            const precedingCustomerMsg = customerMessages
              .filter(cm => new Date(cm.createdAt) < new Date(agentMsg.createdAt))
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
            
            if (precedingCustomerMsg) {
              const responseTimeMs = new Date(agentMsg.createdAt) - new Date(precedingCustomerMsg.createdAt);
              const responseTimeMinutes = responseTimeMs / (1000 * 60);
              
              // Only count reasonable response times (less than 7 days)
              if (responseTimeMinutes > 0 && responseTimeMinutes < 7 * 24 * 60) {
                totalResponseTime += responseTimeMinutes;
                responseCount++;
              }
            }
          }
        }
        
        const avgResponseTime = responseCount > 0 
          ? Math.round(totalResponseTime / responseCount) 
          : 0;

        // Determine last active time
        // Use the most recent message, conversation update, or agent creation/update
        let lastActive = agent.updatedAt || agent.createdAt;
        
        if (agentMessages.length > 0) {
          const lastMessageTime = new Date(agentMessages[0].createdAt);
          if (lastMessageTime > new Date(lastActive)) {
            lastActive = agentMessages[0].createdAt;
          }
        }
        
        if (assignedConversations.length > 0) {
          const lastConvUpdate = assignedConversations
            .map(c => c.updatedAt || c.lastMessageAt || c.createdAt)
            .filter(Boolean)
            .sort((a, b) => new Date(b) - new Date(a))[0];
          
          if (lastConvUpdate && new Date(lastConvUpdate) > new Date(lastActive)) {
            lastActive = lastConvUpdate;
          }
        }

        // Determine online status (active in last 15 minutes) - fallback calculation
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const isOnlineByActivity = new Date(lastActive) > fifteenMinutesAgo;
        
        // Use presenceStatus from database, fallback to calculated status
        const presenceStatus = agent.presenceStatus || (isOnlineByActivity ? 'online' : 'offline');
        const isOnline = presenceStatus === 'online';

        // Calculate customer rating based on resolved tickets and response time
        // Since there's no rating system in the schema, we'll use a calculated value
        let customerRating = '0.0';
        if (resolvedTickets > 0 || avgResponseTime > 0) {
          // Base rating: 3.5 + bonus for resolved tickets and fast response
          let rating = 3.5;
          if (resolvedTickets > 0) {
            rating += Math.min((resolvedTickets / 100) * 1.0, 1.0); // Max 1.0 bonus
          }
          if (avgResponseTime > 0 && avgResponseTime < 60) {
            rating += Math.min((60 - avgResponseTime) / 60 * 0.5, 0.5); // Max 0.5 bonus for fast responses
          }
          customerRating = Math.min(rating, 5.0).toFixed(1);
        }

        // Parse skills if they exist
        let skills = [];
        if (agent.skills) {
          try {
            skills = typeof agent.skills === 'string' ? JSON.parse(agent.skills) : agent.skills;
            if (!Array.isArray(skills)) skills = [];
          } catch (e) {
            skills = [];
          }
        }

        const resolvedRole = agent.role || agent.account?.role || null;

        return {
          id: agent.id,
          slug: agent.slug || `agent-${agent.id.substring(0, 8)}`,
          name: agent.name,
          email: agent.email,
          userId: agent.userId,
          accountId: agent.accountId || null,
          departmentId: agent.departmentId,
          roleId: resolvedRole?.id || agent.roleId || agent.account?.roleId || null,
          role: resolvedRole,
          account: agent.account
            ? {
                id: agent.account.id,
                name: agent.account.name,
                email: agent.account.email,
                status: agent.account.status,
                type: agent.account.type,
                roleId: agent.account.roleId,
                role: agent.account.role
              }
            : null,
          skills: skills,
          department: agent.department
            ? {
                id: agent.department.id,
                name: agent.department.name,
                isActive: agent.department.isActive
              }
            : null,
          isActive: agent.isActive !== undefined ? agent.isActive : true,
          maxLoad: agent.maxLoad,
          presenceStatus: presenceStatus || 'offline',
          lastSeenAt: agent.lastSeenAt ? agent.lastSeenAt.toISOString() : null,
          isOnline,
          lastActive: lastActive instanceof Date ? lastActive.toISOString() : lastActive,
          ticketCount: agent._count.assignedConversations,
          status: presenceStatus || 'offline', // Use presenceStatus instead of calculated status
          performance: {
            ticketsResolved: resolvedTickets,
            avgResponseTime,
            customerRating
          }
        };
      }));

      // Calculate summary stats
      const totalAgents = agents.length;
      const onlineAgents = transformedAgents.filter(agent => agent.isOnline).length;
      const totalTickets = transformedAgents.reduce((sum, agent) => sum + agent.ticketCount, 0);

      res.status(200).json({
        agents: transformedAgents,
        summary: {
          totalAgents,
          onlineAgents,
          offlineAgents: totalAgents - onlineAgents,
          totalTickets,
          avgTicketsPerAgent: totalAgents > 0 ? Math.round(totalTickets / totalAgents) : 0
        }
      });

    } catch (error) {
      console.error('Error fetching agents:', error);
      res.status(500).json({ 
        message: 'Internal server error',
        error: error.message 
      });
    } finally {
      await prisma.$disconnect();
    }
  } 
  else if (req.method === 'POST') {
    // Check permission to create agents
    if (userId) {
      const hasAccess = await checkPermissionOrFail(userId, 'admin.agents.create', res);
      if (!hasAccess) return;
    }
    
    try {
      const { name, email, userId: agentUserId, departmentId, roleId, skills, maxLoad, isActive } = req.body;

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({ 
          message: 'Name and email are required' 
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check if agent with this email already exists
      const existingAgent = await prisma.agent.findUnique({
        where: { email: normalizedEmail }
      });

      if (existingAgent) {
        return res.status(409).json({ 
          message: 'An agent with this email already exists' 
        });
      }

      // Validate department if provided
      if (departmentId) {
        const department = await prisma.department.findUnique({
          where: { id: departmentId }
        });
        if (!department) {
          return res.status(400).json({ 
            message: 'Invalid department ID' 
          });
        }
      }

      // Validate role if provided
      if (roleId) {
        const role = await prisma.role.findUnique({
          where: { id: roleId }
        });
        if (!role) {
          return res.status(400).json({ 
            message: 'Invalid role ID' 
          });
        }
      }

      // Generate unique slug from agent name
      const baseSlug = generateSlug(name);
      const slug = await generateUniqueSlug(
        baseSlug,
        async (slugToCheck) => {
          const existing = await prisma.agent.findUnique({
            where: { slug: slugToCheck }
          });
          return !!existing;
        }
      );

      // Generate unique userId if not provided
      let generatedUserId = userId;
      if (!generatedUserId) {
        // Generate userId in format: AGENT-{YYMM}-{SEQ}
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const yymm = `${year}${month}`;
        
        // Find the last agent with this pattern
        const lastAgent = await prisma.agent.findFirst({
          where: {
            userId: {
              startsWith: `AGENT-${yymm}-`
            }
          },
          orderBy: {
            userId: 'desc'
          }
        });
        
        let sequence = 1;
        if (lastAgent && lastAgent.userId) {
          const lastSeq = parseInt(lastAgent.userId.split('-').pop() || '0', 10);
          sequence = lastSeq + 1;
        }
        
        generatedUserId = `AGENT-${yymm}-${String(sequence).padStart(4, '0')}`;
        
        // Ensure uniqueness (in case of race condition)
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 10) {
          const existing = await prisma.agent.findUnique({
            where: { userId: generatedUserId }
          });
          if (!existing) {
            isUnique = true;
          } else {
            sequence++;
            generatedUserId = `AGENT-${yymm}-${String(sequence).padStart(4, '0')}`;
            attempts++;
          }
        }
      }

      // Parse skills if provided (should be JSON string)
      let parsedSkills = null;
      if (skills) {
        try {
          parsedSkills = typeof skills === 'string' ? JSON.parse(skills) : skills;
          if (!Array.isArray(parsedSkills)) {
            parsedSkills = null;
          }
        } catch (e) {
          parsedSkills = null;
        }
      }

      // Create new agent
      // Create or update user account
      let account = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });

      if (account) {
        account = await prisma.user.update({
          where: { id: account.id },
          data: {
            name: name.trim(),
            roleId: roleId || account.roleId,
            status: isActive !== undefined && !isActive ? 'inactive' : 'active',
            type: 'agent'
          },
          include: {
            role: {
              select: {
                id: true,
                title: true,
                displayAs: true,
                hasSuperPower: true
              }
            }
          }
        });
      } else {
        account = await prisma.user.create({
          data: {
            name: name.trim(),
            email: normalizedEmail,
            roleId: roleId || null,
            status: isActive !== undefined && !isActive ? 'inactive' : 'active',
            type: 'agent'
          },
          include: {
            role: {
              select: {
                id: true,
                title: true,
                displayAs: true,
                hasSuperPower: true
              }
            }
          }
        });
      }

      // Create new agent
      const newAgent = await prisma.agent.create({
        data: {
          name,
          email: normalizedEmail,
          slug,
          userId: generatedUserId,
          accountId: account.id,
          departmentId: departmentId || null,
          roleId: roleId || null,
          skills: parsedSkills ? JSON.stringify(parsedSkills) : null,
          maxLoad: maxLoad ? parseInt(maxLoad) : null,
          isActive: isActive !== undefined ? isActive : true
        },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              isActive: true
            }
          },
          role: {
            select: {
              id: true,
              title: true,
              displayAs: true
            }
          },
          account: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
              type: true,
              roleId: true,
              role: {
                select: {
                  id: true,
                  title: true,
                  displayAs: true,
                  hasSuperPower: true
                }
              }
            }
          }
        }
      });

      // Send welcome email to the new agent
      try {
        const { sendEmail } = await import('../../../../lib/email/service');
        const { agentWelcomeTemplate } = await import('../../../../lib/email/templates');
        
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const loginLink = `${baseUrl}/agent/login`; // Adjust this to your actual agent login URL
        
        // Get admin name from request headers if available
        const adminName = req.headers['x-user-name'] || 'Administrator';
        
        const emailHtml = await agentWelcomeTemplate({
          agentName: newAgent.name,
          agentEmail: newAgent.email,
          agentId: newAgent.userId,
          departmentName: newAgent.department?.name || null,
          roleName: newAgent.role?.title || null,
          loginLink: loginLink,
          adminName: adminName
        });

        // Send email asynchronously (don't wait for it to complete)
        sendEmail({
          to: newAgent.email,
          subject: `Welcome to the Team - Your Agent Account is Ready`,
          html: emailHtml
        }).catch(error => {
          console.error('Failed to send welcome email to agent:', error);
          // Don't fail agent creation if email fails
        });
      } catch (emailError) {
        console.error('Error sending welcome email to agent:', emailError);
        // Don't fail agent creation if email fails
      }

      res.status(201).json({ 
        message: 'Agent created successfully',
        agent: {
          id: newAgent.id,
          name: newAgent.name,
          email: newAgent.email,
          userId: newAgent.userId,
          accountId: newAgent.accountId,
          departmentId: newAgent.departmentId,
          department: newAgent.department,
          role: newAgent.role || newAgent.account?.role || null,
          account: newAgent.account,
          createdAt: newAgent.createdAt
        }
      });

    } catch (error) {
      console.error('Error creating agent:', error);
      res.status(500).json({ 
        message: 'Internal server error',
        error: error.message 
      });
    } finally {
      await prisma.$disconnect();
    }
  }
  else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}