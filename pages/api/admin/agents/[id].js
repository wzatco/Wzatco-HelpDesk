import { PrismaClient } from '@prisma/client';
import { generateSlug, generateUniqueSlug } from '../../../../lib/utils/slug';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      // Try to find by slug first, then by id for backward compatibility
      let agent = await prisma.agent.findUnique({
        where: { slug: id },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              description: true,
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
              subject: true,
              priority: true,
              createdAt: true,
              updatedAt: true,
              lastMessageAt: true
            },
            orderBy: {
              updatedAt: 'desc'
            }
          }
        }
      });

      // Fallback to ID lookup for backward compatibility
      if (!agent) {
        agent = await prisma.agent.findUnique({
          where: { id },
          include: {
            department: {
              select: {
                id: true,
                name: true,
                description: true,
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
                subject: true,
                createdAt: true,
                updatedAt: true
              },
              orderBy: {
                updatedAt: 'desc'
              },
              take: 10
            }
          }
        });
      }

      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }

      // Calculate performance metrics similar to the agents list endpoint
      const assignedConversations = agent.assignedConversations || [];
      
      // Calculate tickets resolved
      const resolvedTickets = assignedConversations.filter(
        conv => conv.status === 'resolved' || conv.status === 'closed'
      ).length;

      // Get all agent messages
      const conversationIds = assignedConversations.map(c => c.id);
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

      // Calculate average response time
      let totalResponseTime = 0;
      let responseCount = 0;
      
      if (agentMessages.length > 0 && conversationIds.length > 0) {
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

        const customerMessagesByConv = {};
        allCustomerMessages.forEach(msg => {
          if (!customerMessagesByConv[msg.conversationId]) {
            customerMessagesByConv[msg.conversationId] = [];
          }
          customerMessagesByConv[msg.conversationId].push(msg);
        });

        for (const agentMsg of agentMessages) {
          const customerMessages = customerMessagesByConv[agentMsg.conversationId] || [];
          const precedingCustomerMsg = customerMessages
            .filter(cm => new Date(cm.createdAt) < new Date(agentMsg.createdAt))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
          
          if (precedingCustomerMsg) {
            const responseTimeMs = new Date(agentMsg.createdAt) - new Date(precedingCustomerMsg.createdAt);
            const responseTimeMinutes = responseTimeMs / (1000 * 60);
            
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

      // Calculate customer rating
      let customerRating = '0.0';
      if (resolvedTickets > 0 || avgResponseTime > 0) {
        let rating = 3.5;
        if (resolvedTickets > 0) {
          rating += Math.min((resolvedTickets / 100) * 1.0, 1.0);
        }
        if (avgResponseTime > 0 && avgResponseTime < 60) {
          rating += Math.min((60 - avgResponseTime) / 60 * 0.5, 0.5);
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

      // Transform agent data with calculated fields
      const resolvedRole = agent.role || agent.account?.role || null;

      const transformedAgent = {
        id: agent.id,
        slug: agent.slug,
        name: agent.name,
        email: agent.email,
        userId: agent.userId,
        accountId: agent.accountId,
        departmentId: agent.departmentId,
        roleId: resolvedRole?.id || agent.roleId || agent.account?.roleId || null,
        skills: skills,
        department: agent.department,
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
        isActive: agent.isActive,
        maxLoad: agent.maxLoad,
        presenceStatus,
        lastSeenAt: agent.lastSeenAt ? agent.lastSeenAt.toISOString() : null,
        isOnline,
        lastActive: lastActive instanceof Date ? lastActive.toISOString() : lastActive,
        ticketCount: assignedConversations.length,
        status: presenceStatus, // Use presenceStatus instead of calculated status
        performance: {
          ticketsResolved: resolvedTickets,
          avgResponseTime,
          customerRating
        }
      };

      return res.status(200).json({ agent: transformedAgent });
    } catch (error) {
      console.error('Error fetching agent:', error);
      return res.status(500).json({ message: 'Failed to fetch agent', error: error.message });
    } finally {
      await prisma.$disconnect();
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { name, email, userId, departmentId, roleId, isActive, maxLoad, skills } = req.body;

      // Try to find agent by slug first, then by id
      let existingAgent = await prisma.agent.findUnique({
        where: { slug: id }
      });
      
      if (!existingAgent) {
        existingAgent = await prisma.agent.findUnique({
          where: { id }
        });
      }

      if (!existingAgent) {
        return res.status(404).json({ message: 'Agent not found' });
      }

      const updateData = {};
      const accountUpdateData = {};

      if (name !== undefined) {
        const trimmedName = name.trim();
        updateData.name = trimmedName;
        accountUpdateData.name = trimmedName;
        // Update slug if name changed
        if (trimmedName !== existingAgent.name) {
          const baseSlug = generateSlug(trimmedName);
          updateData.slug = await generateUniqueSlug(
            baseSlug,
            async (slugToCheck) => {
              const existing = await prisma.agent.findUnique({
                where: { slug: slugToCheck }
              });
              return !!existing && existing.id !== existingAgent.id;
            }
          );
        }
      }

      if (email !== undefined) {
        const normalizedEmail = email.trim().toLowerCase();
        // Check if another agent with this email exists
        const agentWithEmail = await prisma.agent.findFirst({
          where: { 
            email: normalizedEmail,
            id: { not: existingAgent.id }
          }
        });

        if (agentWithEmail) {
          return res.status(400).json({ message: 'An agent with this email already exists' });
        }
        updateData.email = normalizedEmail;
        accountUpdateData.email = normalizedEmail;
      }

      if (userId !== undefined) {
        updateData.userId = userId?.trim() || null;
      }

      if (departmentId !== undefined) {
        if (departmentId === null || departmentId === '') {
          updateData.departmentId = null;
        } else {
          // Validate department exists
          const department = await prisma.department.findUnique({
            where: { id: departmentId }
          });
          if (!department) {
            return res.status(400).json({ message: 'Invalid department ID' });
          }
          updateData.departmentId = departmentId;
        }
      }

      if (roleId !== undefined) {
        if (roleId === null || roleId === '') {
          updateData.roleId = null;
          accountUpdateData.roleId = null;
        } else {
          // Validate role exists
          const role = await prisma.role.findUnique({
            where: { id: roleId }
          });
          if (!role) {
            return res.status(400).json({ message: 'Invalid role ID' });
          }
          updateData.roleId = roleId;
          accountUpdateData.roleId = roleId;
        }
      }

      if (isActive !== undefined) {
        updateData.isActive = isActive;
        accountUpdateData.status = isActive ? 'active' : 'inactive';
      }

      if (maxLoad !== undefined) {
        updateData.maxLoad = maxLoad ? parseInt(maxLoad) : null;
      }

      if (skills !== undefined) {
        // Parse skills if provided (should be JSON string or array)
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
        updateData.skills = parsedSkills ? JSON.stringify(parsedSkills) : null;
      }

      let agent = await prisma.agent.update({
        where: { id: existingAgent.id },
        data: updateData,
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
          }
        }
      });

      const shouldSyncAccount =
        Object.keys(accountUpdateData).length > 0 || !agent.accountId || !agent.account;

      if (shouldSyncAccount) {
        const emailForAccount = accountUpdateData.email || agent.email || existingAgent.email;
        const resolvedRoleId =
          accountUpdateData.roleId !== undefined
            ? accountUpdateData.roleId
            : agent.role?.id || agent.account?.roleId || agent.roleId || null;

        const accountData = {
          name: accountUpdateData.name || agent.name,
          status: accountUpdateData.status || (agent.isActive ? 'active' : 'inactive'),
          roleId: resolvedRoleId,
          type: 'agent'
        };

        if (agent.accountId) {
          await prisma.user.update({
            where: { id: agent.accountId },
            data: {
              name: accountData.name,
              email: emailForAccount || agent.email,
              status: accountData.status,
              roleId: resolvedRoleId
            }
          });
        } else if (emailForAccount) {
          const upsertedAccount = await prisma.user.upsert({
            where: { email: emailForAccount },
            update: {
              name: accountData.name,
              status: accountData.status,
              roleId: accountData.roleId || null,
              type: accountData.type
            },
            create: {
              name: accountData.name,
              email: emailForAccount,
              status: accountData.status,
              roleId: accountData.roleId || null,
              type: accountData.type
            }
          });

          agent = await prisma.agent.update({
            where: { id: agent.id },
            data: { accountId: upsertedAccount.id },
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
              }
            }
          });
        }
      }

      agent = await prisma.agent.findUnique({
        where: { id: agent.id },
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
          }
        }
      });

      // Parse skills if they exist
      let agentSkills = [];
      if (agent.skills) {
        try {
          agentSkills = typeof agent.skills === 'string' ? JSON.parse(agent.skills) : agent.skills;
          if (!Array.isArray(agentSkills)) agentSkills = [];
        } catch (e) {
          agentSkills = [];
        }
      }

      // Transform agent response
      const transformedAgent = {
        ...agent,
        roleId: agent.role?.id || agent.account?.roleId || agent.roleId || null,
        role: agent.role || agent.account?.role || null,
        skills: agentSkills
      };

      return res.status(200).json({ agent: transformedAgent });
    } catch (error) {
      console.error('Error updating agent:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Agent not found' });
      }
      return res.status(500).json({ message: 'Failed to update agent', error: error.message });
    } finally {
      await prisma.$disconnect();
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Try to find agent by slug first, then by id
      let agentToDelete = await prisma.agent.findUnique({
        where: { slug: id }
      });
      
      if (!agentToDelete) {
        agentToDelete = await prisma.agent.findUnique({
          where: { id }
        });
      }

      if (!agentToDelete) {
        return res.status(404).json({ message: 'Agent not found' });
      }

      // Check if agent has assigned conversations
      const assignedCount = await prisma.conversation.count({
        where: { assigneeId: agentToDelete.id }
      });

      if (assignedCount > 0) {
        return res.status(400).json({ 
          message: `Cannot delete agent. They have ${assignedCount} assigned ticket(s). Please reassign tickets first.` 
        });
      }

      await prisma.agent.delete({
        where: { id: agentToDelete.id }
      });

      if (agentToDelete.accountId) {
        await prisma.user.update({
          where: { id: agentToDelete.accountId },
          data: { status: 'inactive' }
        });
      }

      return res.status(200).json({ message: 'Agent deleted successfully' });
    } catch (error) {
      console.error('Error deleting agent:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Agent not found' });
      }
      return res.status(500).json({ message: 'Failed to delete agent', error: error.message });
    } finally {
      await prisma.$disconnect();
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

