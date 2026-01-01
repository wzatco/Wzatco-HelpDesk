import prisma, { ensurePrismaConnected } from './prisma';

/**
 * Assignment Engine - Automatically assigns tickets based on configured rules
 * Rules are evaluated in priority order (lower number = higher priority)
 */

/**
 * Get all enabled assignment rules ordered by priority
 */
async function getEnabledRules() {
  return await prisma.assignmentRule.findMany({
    where: { enabled: true },
    orderBy: { priority: 'asc' }
  });
}

/**
 * Round-robin assignment
 * Distributes tickets evenly among available agents
 */
async function assignRoundRobin(conversation, ruleConfig = {}) {
  try {
    // Get active AND online agents only
    const agents = await prisma.agent.findMany({
      where: { 
        isActive: true,
        presenceStatus: 'online' // Only assign to online agents
      },
      orderBy: { createdAt: 'asc' }
    });

    if (agents.length === 0) {
      return null;
    }

    // Get the last assignment for this rule type
    const lastAssignment = await prisma.assignmentHistory.findFirst({
      where: { ruleType: 'round_robin' },
      orderBy: { assignedAt: 'desc' }
    });

    // Find the index of the last assigned agent
    let nextIndex = 0;
    if (lastAssignment) {
      const lastIndex = agents.findIndex(a => a.id === lastAssignment.assignedToId);
      if (lastIndex >= 0) {
        nextIndex = (lastIndex + 1) % agents.length;
      }
    }

    const selectedAgent = agents[nextIndex];
    return selectedAgent;
  } catch (error) {
    console.error('Error in round-robin assignment:', error);
    return null;
  }
}

/**
 * Load-based assignment
 * Assigns to agent with the fewest active tickets
 */
async function assignLoadBased(conversation, ruleConfig = {}) {
  try {
    // Get active AND online agents with their current load
    const agents = await prisma.agent.findMany({
      where: { 
        isActive: true,
        presenceStatus: 'online' // Only assign to online agents
      },
      include: {
        assignedConversations: {
          where: {
            status: {
              in: ['open', 'pending']
            }
          }
        }
      }
    });

    if (agents.length === 0) {
      return null;
    }

    // Calculate load for each agent
    const agentsWithLoad = agents.map(agent => ({
      ...agent,
      currentLoad: agent.assignedConversations.length,
      maxLoad: agent.maxLoad || 999 // Default to high number if not set
    }));

    // Filter agents who haven't reached max load
    const availableAgents = agentsWithLoad.filter(a => a.currentLoad < a.maxLoad);

    if (availableAgents.length === 0) {
      // If all agents are at max load, assign to the one with lowest load
      const sorted = agentsWithLoad.sort((a, b) => a.currentLoad - b.currentLoad);
      return sorted[0];
    }

    // Sort by current load (ascending)
    const sorted = availableAgents.sort((a, b) => a.currentLoad - b.currentLoad);
    return sorted[0];
  } catch (error) {
    console.error('Error in load-based assignment:', error);
    return null;
  }
}

/**
 * Department-based assignment
 * Assigns to agents in matching department
 */
async function assignDepartmentMatch(conversation, ruleConfig = {}) {
  try {
    // Get conversation category/department
    const conversationDepartment = conversation.category || 'WZATCO';

    // Get all active AND online agents from the department
    const agents = await prisma.agent.findMany({
      where: {
        isActive: true,
        presenceStatus: 'online', // Only assign to online agents
        department: conversationDepartment
      },
      include: {
        assignedConversations: {
          where: {
            status: {
              in: ['open', 'pending']
            }
          }
        }
      }
    });

    if (agents.length === 0) {
      // Fallback: try to find agents without department filter
      const fallbackAgents = await prisma.agent.findMany({
        where: { isActive: true },
        include: {
          assignedConversations: {
            where: {
              status: {
                in: ['open', 'pending']
              }
            }
          }
        }
      });
      if (fallbackAgents.length === 0) return null;
      const sorted = fallbackAgents.sort((a, b) => a.assignedConversations.length - b.assignedConversations.length);
      return sorted[0];
    }

    // Sort by load (ascending)
    const sorted = agents.sort((a, b) => a.assignedConversations.length - b.assignedConversations.length);
    return sorted[0];
  } catch (error) {
    console.error('Error in department match assignment:', error);
    return null;
  }
}

/**
 * Skill-based assignment
 * Assigns to agents with matching skills/categories
 */
async function assignSkillMatch(conversation, ruleConfig = {}) {
  try {
    // Get conversation category
    const conversationCategory = conversation.category || 'WZATCO';

    // Get all active AND online agents
    const agents = await prisma.agent.findMany({
      where: { 
        isActive: true,
        presenceStatus: 'online' // Only assign to online agents
      },
      include: {
        assignedConversations: {
          where: {
            status: {
              in: ['open', 'pending']
            }
          }
        }
      }
    });

    if (agents.length === 0) {
      return null;
    }

    // Filter agents with matching skills
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
      // Fallback to load-based if no skill match
      const sorted = agents.sort((a, b) => a.assignedConversations.length - b.assignedConversations.length);
      return sorted[0];
    }

    // Sort by load (ascending)
    const sorted = matchingAgents.sort((a, b) => a.assignedConversations.length - b.assignedConversations.length);
    return sorted[0];
  } catch (error) {
    console.error('Error in skill match assignment:', error);
    return null;
  }
}

/**
 * Main assignment function
 * Evaluates rules in priority order and assigns ticket to first matching rule
 */
export async function assignTicket(conversationId) {
  try {
    // Get conversation
    const conversation = await prisma.conversation.findUnique({
      where: { ticketNumber: conversationId }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // If already assigned, don't reassign
    if (conversation.assigneeId) {
      return { assigned: false, reason: 'Already assigned' };
    }

    // Get enabled rules
    const rules = await getEnabledRules();

    if (rules.length === 0) {
      return { assigned: false, reason: 'No assignment rules configured' };
    }

    // Evaluate rules in priority order
    for (const rule of rules) {
      let assignedAgent = null;
      let config = {};

      try {
        if (rule.config) {
          config = JSON.parse(rule.config);
        }
      } catch {
        // Invalid config, use defaults
      }

      switch (rule.ruleType) {
        case 'round_robin':
          assignedAgent = await assignRoundRobin(conversation, config);
          break;
        case 'load_based':
          assignedAgent = await assignLoadBased(conversation, config);
          break;
        case 'department_match':
          assignedAgent = await assignDepartmentMatch(conversation, config);
          break;
        case 'skill_match':
          assignedAgent = await assignSkillMatch(conversation, config);
          break;
        default:
          console.warn(`Unknown rule type: ${rule.ruleType}`);
          continue;
      }

      // If a rule found an agent, assign and stop
      if (assignedAgent) {
        // Update conversation
        await prisma.conversation.update({
          where: { ticketNumber: conversationId },
          data: { assigneeId: assignedAgent.id }
        });

        // Get agent's current load for metadata
        const agentLoad = await prisma.conversation.count({
          where: {
            assigneeId: assignedAgent.id,
            status: { in: ['open', 'pending'] }
          }
        });

        // Record assignment history
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

        // Create activity log
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

/**
 * Preview assignment without actually assigning
 * Useful for testing rules
 */
export async function previewAssignment(conversation) {
  try {
    const rules = await getEnabledRules();

    if (rules.length === 0) {
      return { assigned: false, reason: 'No assignment rules configured' };
    }

    const results = [];

    for (const rule of rules) {
      let assignedAgent = null;
      let config = {};

      try {
        if (rule.config) {
          config = JSON.parse(rule.config);
        }
      } catch {
        // Invalid config, use defaults
      }

      switch (rule.ruleType) {
        case 'round_robin':
          assignedAgent = await assignRoundRobin(conversation, config);
          break;
        case 'load_based':
          assignedAgent = await assignLoadBased(conversation, config);
          break;
        case 'department_match':
          assignedAgent = await assignDepartmentMatch(conversation, config);
          break;
        case 'skill_match':
          assignedAgent = await assignSkillMatch(conversation, config);
          break;
      }

      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.ruleType,
        priority: rule.priority,
        matched: !!assignedAgent,
        agent: assignedAgent ? {
          id: assignedAgent.id,
          name: assignedAgent.name,
          email: assignedAgent.email
        } : null
      });

      // Stop at first match for preview
      if (assignedAgent) {
        break;
      }
    }

    return { results, firstMatch: results.find(r => r.matched) || null };
  } catch (error) {
    console.error('Error in previewAssignment:', error);
    throw error;
  }
}

