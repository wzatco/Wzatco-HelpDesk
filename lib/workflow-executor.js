import { PrismaClient } from '@prisma/client';
import { SLAService } from './sla-service';

const prisma = new PrismaClient();

/**
 * SLA Workflow Execution Engine
 * Processes workflows created in the visual builder
 */

export class WorkflowExecutor {
  /**
   * Execute a workflow based on trigger
   * @param {string} workflowId - Workflow to execute
   * @param {object} context - Execution context (ticket data, event info, etc.)
   */
  static async executeWorkflow(workflowId, context) {
    try {
      console.log(`[Workflow] Executing workflow ${workflowId}`);
      
      // Load workflow from database
      const workflow = await prisma.sLAWorkflow.findUnique({
        where: { id: workflowId },
        include: { policy: true },
      });

      if (!workflow || !workflow.isActive) {
        console.log(`[Workflow] Workflow ${workflowId} not found or not active`);
        return { success: false, message: 'Workflow not active' };
      }

      // Parse workflow data
      const workflowData = JSON.parse(workflow.workflowData);
      const { nodes, edges } = workflowData;

      // Find trigger node
      const triggerNode = nodes.find(node => 
        node.data.id === 'ticket_created' ||
        node.data.id === 'ticket_updated' ||
        node.data.id === 'time_scheduler'
      );

      if (!triggerNode) {
        console.log(`[Workflow] No trigger node found`);
        return { success: false, message: 'No trigger node' };
      }

      // Start execution from trigger
      const result = await this.executeNode(triggerNode, nodes, edges, context, workflow);
      
      console.log(`[Workflow] Execution complete:`, result);
      return result;
    } catch (error) {
      console.error('[Workflow] Execution error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute a single node and follow its connections
   */
  static async executeNode(currentNode, allNodes, allEdges, context, workflow) {
    try {
      console.log(`[Workflow] Executing node: ${currentNode.data.label} (${currentNode.data.id})`);

      // Execute node based on type
      let nodeResult;
      const nodeType = currentNode.data.id;
      const nodeConfig = currentNode.data.config || {};

      switch (nodeType) {
        // TRIGGERS
        case 'ticket_created':
        case 'ticket_updated':
          nodeResult = await this.executeTriggerNode(nodeType, nodeConfig, context);
          break;

        // SLA TIMERS
        case 'start_sla_timer':
          nodeResult = await this.executeStartSLATimer(nodeConfig, context, workflow);
          break;

        case 'pause_sla':
          nodeResult = await this.executePauseSLA(nodeConfig, context);
          break;

        case 'resume_sla':
          nodeResult = await this.executeResumeSLA(nodeConfig, context);
          break;

        case 'check_sla_time':
          nodeResult = await this.executeCheckSLATime(nodeConfig, context);
          break;

        case 'sla_warning':
          nodeResult = await this.executeSLAWarning(nodeConfig, context);
          break;

        case 'sla_breach':
          nodeResult = await this.executeSLABreach(nodeConfig, context);
          break;

        // LOGIC/CONDITIONS
        case 'condition_if':
          nodeResult = await this.executeCondition(nodeConfig, context);
          break;

        case 'switch_node':
          nodeResult = await this.executeSwitch(nodeConfig, context);
          break;

        case 'wait_delay':
          nodeResult = await this.executeWait(nodeConfig, context);
          break;

        // ACTIONS
        case 'send_email':
        case 'send_sms':
        case 'send_notification':
          nodeResult = await this.executeSendNotification(nodeType, nodeConfig, context);
          break;

        case 'update_field':
          nodeResult = await this.executeUpdateField(nodeConfig, context);
          break;

        case 'assign_ticket':
          nodeResult = await this.executeAssignTicket(nodeConfig, context);
          break;

        case 'add_note':
          nodeResult = await this.executeAddNote(nodeConfig, context);
          break;

        case 'escalation':
          nodeResult = await this.executeEscalation(nodeConfig, context);
          break;

        default:
          console.log(`[Workflow] Unknown node type: ${nodeType}`);
          nodeResult = { success: true, continue: true };
      }

      // If node execution failed or should stop, return
      if (!nodeResult.success || nodeResult.stop) {
        return nodeResult;
      }

      // Find next nodes based on edges
      const outgoingEdges = allEdges.filter(edge => edge.source === currentNode.id);

      if (outgoingEdges.length === 0) {
        console.log(`[Workflow] End of workflow reached`);
        return { success: true, message: 'Workflow completed' };
      }

      // For condition nodes, choose path based on result
      if (nodeType === 'condition_if' && nodeResult.condition !== undefined) {
        const nextEdge = outgoingEdges.find(edge => 
          nodeResult.condition ? edge.sourceHandle === 'true' : edge.sourceHandle === 'false'
        );
        
        if (nextEdge) {
          const nextNode = allNodes.find(n => n.id === nextEdge.target);
          if (nextNode) {
            return await this.executeNode(nextNode, allNodes, allEdges, context, workflow);
          }
        }
        return { success: true, message: 'No matching path found' };
      }

      // Execute all next nodes (for parallel execution)
      const results = [];
      for (const edge of outgoingEdges) {
        const nextNode = allNodes.find(n => n.id === edge.target);
        if (nextNode) {
          const result = await this.executeNode(nextNode, allNodes, allEdges, context, workflow);
          results.push(result);
        }
      }

      return { success: true, results };
    } catch (error) {
      console.error(`[Workflow] Node execution error:`, error);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // TRIGGER NODE EXECUTORS
  // ============================================

  static async executeTriggerNode(nodeType, config, context) {
    // Triggers don't execute, they just pass through
    // Filtering was already done before calling executeWorkflow
    return { success: true, continue: true };
  }

  // ============================================
  // SLA TIMER NODE EXECUTORS
  // ============================================

  static async executeStartSLATimer(config, context, workflow) {
    try {
      const { conversationId, priority } = context;
      
      if (!conversationId) {
        return { success: false, message: 'No conversation ID in context' };
      }

      // Get the actual priority from ticket or context
      const ticketPriority = priority || context.ticket?.priority || 'medium';
      
      // Determine SLA times based on config
      let responseDuration, resolutionDuration;
      let policyId = context.policyId;
      
      if (config.slaPolicy === 'custom') {
        // Use custom durations from node config
        responseDuration = this.convertToMinutes(config.responseDuration, config.responseDurationUnit);
        resolutionDuration = this.convertToMinutes(config.resolutionDuration, config.resolutionDurationUnit);
        // Use workflow's policy ID if available
        policyId = workflow?.policyId || policyId || 'workflow-custom';
      } else {
        // Fetch the actual policy from database
        const policyIdToUse = workflow?.policyId || config.slaPolicyId || policyId;
        
        if (policyIdToUse) {
          // Fetch policy from database
          const policy = await prisma.sLAPolicy.findUnique({
            where: { id: policyIdToUse },
          });

          if (policy) {
            // Use actual policy times based on ticket priority
            responseDuration = SLAService.getResponseTime(policy, ticketPriority);
            resolutionDuration = SLAService.getResolutionTime(policy, ticketPriority);
            policyId = policy.id;
            
            if (!responseDuration || !resolutionDuration) {
              console.warn(`[Workflow] No SLA times for priority ${ticketPriority} in policy ${policy.name}, using defaults`);
              // Fallback to medium priority times
              responseDuration = policy.mediumResponseTime || 240;
              resolutionDuration = policy.mediumResolutionTime || 1440;
            }
          } else {
            console.warn(`[Workflow] Policy ${policyIdToUse} not found, using hardcoded defaults`);
            // Fallback to hardcoded times
            const policyTimes = {
              urgent: { response: 15, resolution: 240 },
              high: { response: 60, resolution: 480 },
              medium: { response: 240, resolution: 1440 },
              low: { response: 480, resolution: 2880 },
            };
            const times = policyTimes[ticketPriority.toLowerCase()] || policyTimes.medium;
            responseDuration = times.response;
            resolutionDuration = times.resolution;
            policyId = policyIdToUse;
          }
        } else {
          // No policy ID, use hardcoded defaults based on priority
          console.warn(`[Workflow] No policy ID provided, using hardcoded defaults for ${ticketPriority}`);
          const policyTimes = {
            urgent: { response: 15, resolution: 240 },
            high: { response: 60, resolution: 480 },
            medium: { response: 240, resolution: 1440 },
            low: { response: 480, resolution: 2880 },
          };
          const times = policyTimes[ticketPriority.toLowerCase()] || policyTimes.medium;
          responseDuration = times.response;
          resolutionDuration = times.resolution;
          policyId = 'workflow-default';
        }
      }

      // Create response timer
      const responseTimer = await prisma.sLATimer.create({
        data: {
          conversationId,
          policyId: policyId,
          timerType: 'response',
          status: 'running',
          targetTime: responseDuration,
          remainingTime: responseDuration,
          elapsedTime: 0,
          initialPriority: ticketPriority,
        },
      });

      // Create resolution timer
      const resolutionTimer = await prisma.sLATimer.create({
        data: {
          conversationId,
          policyId: policyId,
          timerType: 'resolution',
          status: 'running',
          targetTime: resolutionDuration,
          remainingTime: resolutionDuration,
          elapsedTime: 0,
          initialPriority: ticketPriority,
        },
      });

      console.log(`[Workflow] SLA timers started for ticket ${conversationId}: Response=${responseDuration}min, Resolution=${resolutionDuration}min (Priority: ${ticketPriority}, Policy: ${policyId})`);
      return { success: true, continue: true, timers: { response: responseTimer, resolution: resolutionTimer } };
    } catch (error) {
      console.error('[Workflow] Start SLA timer error:', error);
      return { success: false, error: error.message };
    }
  }

  static async executePauseSLA(config, context) {
    try {
      const { conversationId } = context;
      
      await prisma.sLATimer.updateMany({
        where: {
          conversationId,
          status: 'running',
        },
        data: {
          status: 'paused',
          pausedAt: new Date(),
        },
      });

      console.log(`[Workflow] SLA timers paused for ticket ${conversationId}`);
      return { success: true, continue: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async executeResumeSLA(config, context) {
    try {
      const { conversationId } = context;
      
      await prisma.sLATimer.updateMany({
        where: {
          conversationId,
          status: 'paused',
        },
        data: {
          status: 'running',
          resumedAt: new Date(),
        },
      });

      console.log(`[Workflow] SLA timers resumed for ticket ${conversationId}`);
      return { success: true, continue: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async executeCheckSLATime(config, context) {
    try {
      const { conversationId } = context;
      
      const timers = await prisma.sLATimer.findMany({
        where: { conversationId },
      });

      if (timers.length === 0) {
        return { success: false, message: 'No SLA timers found' };
      }

      // Calculate metrics
      const metrics = timers.map(timer => ({
        type: timer.timerType,
        elapsed: timer.targetTime - timer.remainingTime,
        remaining: timer.remainingTime,
        atRisk: timer.remainingTime < (timer.targetTime * 0.2),
        breached: timer.status === 'breached',
      }));

      // Add to context for next nodes
      context.slaMetrics = metrics;

      return { success: true, continue: true, metrics };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async executeSLAWarning(config, context) {
    try {
      const { conversationId } = context;
      const threshold = parseInt(config.threshold) / 100;
      
      const timers = await prisma.sLATimer.findMany({
        where: { conversationId, status: 'running' },
      });

      for (const timer of timers) {
        const percentRemaining = timer.remainingTime / timer.targetTime;
        
        if (percentRemaining <= (1 - threshold)) {
          // Send warning notification
          await this.sendInternalNotification({
            type: 'sla_warning',
            conversationId,
            message: `SLA ${timer.timerType} is at ${Math.round(percentRemaining * 100)}% - ${timer.remainingTime} minutes remaining`,
            priority: config.alertPriority || 'medium',
          });
        }
      }

      return { success: true, continue: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async executeSLABreach(config, context) {
    try {
      const { conversationId } = context;
      const actions = config.breachActions || [];

      // Mark timers as breached
      await prisma.sLATimer.updateMany({
        where: {
          conversationId,
          status: 'running',
          remainingTime: { lte: 0 },
        },
        data: {
          status: 'breached',
          breachedAt: new Date(),
        },
      });

      // Record breach
      await prisma.sLABreach.create({
        data: {
          conversationId,
          policyId: context.policyId || 'workflow-generated',
          timerType: 'resolution',
          breachedAt: new Date(),
        },
      });

      // Execute breach actions
      if (actions.includes('send_email')) {
        await this.sendInternalNotification({
          type: 'sla_breach',
          conversationId,
          message: `SLA BREACHED for ticket ${conversationId}`,
          priority: 'urgent',
        });
      }

      if (actions.includes('change_priority')) {
        context.newPriority = 'urgent';
      }

      console.log(`[Workflow] SLA breach handled for ticket ${conversationId}`);
      return { success: true, continue: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // LOGIC/CONDITION NODE EXECUTORS
  // ============================================

  static async executeCondition(config, context) {
    try {
      const { field, operator, value } = config;
      
      // Get field value from context (ticket data)
      const fieldValue = context[field] || context.ticket?.[field];

      let condition = false;

      switch (operator) {
        case 'equals':
          condition = fieldValue == value;
          break;
        case 'not_equals':
          condition = fieldValue != value;
          break;
        case 'greater_than':
          condition = parseFloat(fieldValue) > parseFloat(value);
          break;
        case 'less_than':
          condition = parseFloat(fieldValue) < parseFloat(value);
          break;
        case 'greater_or_equal':
          condition = parseFloat(fieldValue) >= parseFloat(value);
          break;
        case 'less_or_equal':
          condition = parseFloat(fieldValue) <= parseFloat(value);
          break;
        case 'contains':
          condition = String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
          break;
        default:
          condition = false;
      }

      console.log(`[Workflow] Condition: ${field} ${operator} ${value} = ${condition}`);
      return { success: true, continue: true, condition };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async executeSwitch(config, context) {
    // Switch node execution would determine which branch to take
    // Similar to condition but with multiple outputs
    return { success: true, continue: true };
  }

  static async executeWait(config, context) {
    // For async execution, store the workflow state and resume later
    // For now, we'll just log it
    console.log(`[Workflow] Wait node: ${config.delayDuration} ${config.delayUnit}`);
    return { success: true, continue: true };
  }

  // ============================================
  // ACTION NODE EXECUTORS
  // ============================================

  static async executeSendNotification(nodeType, config, context) {
    try {
      const { conversationId } = context;
      const { recipient, subject, messageTemplate } = config;

      // Replace variables in template
      const message = this.replaceVariables(messageTemplate, context);

      await this.sendInternalNotification({
        type: nodeType,
        conversationId,
        recipient,
        subject,
        message,
      });

      console.log(`[Workflow] Notification sent to ${recipient}`);
      return { success: true, continue: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async executeUpdateField(config, context) {
    try {
      const { conversationId } = context;
      const { fieldToUpdate, newValue } = config;

      // Update ticket in database
      const updateData = {};
      
      if (fieldToUpdate === 'priority') {
        updateData.priority = newValue;
      } else if (fieldToUpdate === 'status') {
        updateData.status = newValue;
      } else if (fieldToUpdate === 'category') {
        updateData.categoryId = newValue;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: updateData,
        });

        console.log(`[Workflow] Updated ${fieldToUpdate} to ${newValue}`);
      }

      return { success: true, continue: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async executeAssignTicket(config, context) {
    try {
      const { conversationId } = context;
      const { assignTo, userId, teamId } = config;

      let assignedUserId = null;

      if (assignTo === 'specific_user') {
        assignedUserId = userId;
      } else if (assignTo === 'round_robin') {
        // Implement round-robin logic
        assignedUserId = await this.getRoundRobinUser(context);
      }

      if (assignedUserId) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { assignedUserId },
        });

        console.log(`[Workflow] Ticket assigned to user ${assignedUserId}`);
      }

      return { success: true, continue: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async executeAddNote(config, context) {
    try {
      const { conversationId } = context;
      const { noteContent, visibleToCustomer } = config;

      const message = this.replaceVariables(noteContent, context);

      await prisma.message.create({
        data: {
          conversationId,
          content: message,
          isInternal: !visibleToCustomer,
          sender: 'system',
          senderType: 'system',
        },
      });

      console.log(`[Workflow] Note added to ticket ${conversationId}`);
      return { success: true, continue: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async executeEscalation(config, context) {
    try {
      const { conversationId } = context;
      const { escalationLevel, escalationActions } = config;

      // Record escalation
      await prisma.sLAEscalation.create({
        data: {
          conversationId,
          policyId: context.policyId || 'workflow-generated',
          escalationLevel: parseInt(escalationLevel),
          notifiedAt: new Date(),
        },
      });

      // Execute escalation actions
      if (escalationActions?.includes('notify_supervisor')) {
        await this.sendInternalNotification({
          type: 'escalation',
          conversationId,
          message: `Ticket ${conversationId} escalated to level ${escalationLevel}`,
          priority: 'high',
        });
      }

      console.log(`[Workflow] Escalation level ${escalationLevel} triggered`);
      return { success: true, continue: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  static convertToMinutes(value, unit) {
    const val = parseInt(value) || 0;
    switch (unit) {
      case 'minutes': return val;
      case 'hours': return val * 60;
      case 'days': return val * 60 * 24;
      default: return val;
    }
  }

  static replaceVariables(template, context) {
    if (!template) return '';
    
    let result = template;
    result = result.replace(/\{\{ticketId\}\}/g, context.conversationId || '');
    result = result.replace(/\{\{priority\}\}/g, context.priority || '');
    result = result.replace(/\{\{timeRemaining\}\}/g, context.timeRemaining || '');
    result = result.replace(/\{\{status\}\}/g, context.status || '');
    
    return result;
  }

  static async sendInternalNotification(data) {
    // TODO: Implement actual notification system
    console.log('[Workflow] Notification:', data);
    // Could integrate with email service, Slack, etc.
  }

  static async getRoundRobinUser(context) {
    // TODO: Implement round-robin logic
    const users = await prisma.user.findMany({
      where: { role: 'agent', isActive: true },
    });
    
    if (users.length === 0) return null;
    
    // Simple round-robin: get user with least assigned tickets
    const userCounts = await prisma.conversation.groupBy({
      by: ['assignedUserId'],
      _count: true,
      where: {
        status: { notIn: ['closed', 'resolved'] },
      },
    });

    const userWithLeast = users.reduce((min, user) => {
      const count = userCounts.find(c => c.assignedUserId === user.id)?._count || 0;
      const minCount = userCounts.find(c => c.assignedUserId === min.id)?._count || 0;
      return count < minCount ? user : min;
    }, users[0]);

    return userWithLeast.id;
  }
}

export default WorkflowExecutor;

