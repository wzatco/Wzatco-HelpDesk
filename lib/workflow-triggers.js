import { PrismaClient } from '@prisma/client';
import { WorkflowExecutor } from './workflow-executor';

const prisma = new PrismaClient();

/**
 * SLA Workflow Triggers
 * Hooks into ticket events and triggers appropriate workflows
 */

export class WorkflowTriggers {
  /**
   * Called when a new ticket is created
   */
  static async onTicketCreated(ticket) {
    try {
      console.log(`[Workflow Trigger] Ticket created: ${ticket.id}`);

      // Find all active workflows with ticket_created trigger
      const workflows = await prisma.sLAWorkflow.findMany({
        where: {
          isActive: true,
          isDraft: false,
        },
      });

      for (const workflow of workflows) {
        try {
          const workflowData = JSON.parse(workflow.workflowData);
          const { nodes } = workflowData;

          // Check if workflow has ticket_created trigger
          const triggerNode = nodes.find(node => node.data.id === 'ticket_created');
          
          if (!triggerNode) continue;

          // Check trigger filters
          const config = triggerNode.data.config || {};
          
          if (!this.matchesFilters(ticket, config)) {
            console.log(`[Workflow Trigger] Ticket ${ticket.id} doesn't match workflow ${workflow.id} filters`);
            continue;
          }

          // Build execution context
          const context = {
            conversationId: ticket.id,
            priority: ticket.priority,
            status: ticket.status,
            category: ticket.categoryId,
            department: ticket.departmentId,
            channel: ticket.channel,
            ticket: ticket,
            policyId: workflow.policyId,
            event: 'ticket_created',
          };

          // Execute workflow asynchronously
          console.log(`[Workflow Trigger] Executing workflow ${workflow.id} for ticket ${ticket.id}`);
          WorkflowExecutor.executeWorkflow(workflow.id, context)
            .then(result => {
              console.log(`[Workflow Trigger] Workflow ${workflow.id} completed:`, result);
            })
            .catch(error => {
              console.error(`[Workflow Trigger] Workflow ${workflow.id} error:`, error);
            });

        } catch (error) {
          console.error(`[Workflow Trigger] Error processing workflow ${workflow.id}:`, error);
        }
      }

      return { success: true, message: 'Workflows triggered' };
    } catch (error) {
      console.error('[Workflow Trigger] onTicketCreated error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Called when a ticket is updated
   */
  static async onTicketUpdated(ticket, changes) {
    try {
      console.log(`[Workflow Trigger] Ticket updated: ${ticket.id}`, changes);

      // Find all active workflows with ticket_updated trigger
      const workflows = await prisma.sLAWorkflow.findMany({
        where: {
          isActive: true,
          isDraft: false,
        },
      });

      for (const workflow of workflows) {
        try {
          const workflowData = JSON.parse(workflow.workflowData);
          const { nodes } = workflowData;

          // Check if workflow has ticket_updated trigger
          const triggerNode = nodes.find(node => node.data.id === 'ticket_updated');
          
          if (!triggerNode) continue;

          // Check if watched fields changed
          const config = triggerNode.data.config || {};
          const watchFields = config.watchFields || [];
          
          const hasMatchingChange = watchFields.some(field => 
            changes.hasOwnProperty(field)
          );

          if (!hasMatchingChange && watchFields.length > 0) {
            console.log(`[Workflow Trigger] No watched fields changed for workflow ${workflow.id}`);
            continue;
          }

          // Build execution context
          const context = {
            conversationId: ticket.id,
            priority: ticket.priority,
            status: ticket.status,
            category: ticket.categoryId,
            department: ticket.departmentId,
            channel: ticket.channel,
            ticket: ticket,
            changes: changes,
            policyId: workflow.policyId,
            event: 'ticket_updated',
          };

          // Execute workflow asynchronously
          console.log(`[Workflow Trigger] Executing workflow ${workflow.id} for ticket update ${ticket.id}`);
          WorkflowExecutor.executeWorkflow(workflow.id, context)
            .then(result => {
              console.log(`[Workflow Trigger] Workflow ${workflow.id} completed:`, result);
            })
            .catch(error => {
              console.error(`[Workflow Trigger] Workflow ${workflow.id} error:`, error);
            });

        } catch (error) {
          console.error(`[Workflow Trigger] Error processing workflow ${workflow.id}:`, error);
        }
      }

      return { success: true, message: 'Workflows triggered' };
    } catch (error) {
      console.error('[Workflow Trigger] onTicketUpdated error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if ticket matches trigger filters
   */
  static matchesFilters(ticket, config) {
    // Check department filter
    if (config.department && config.department !== '' && ticket.departmentId !== config.department) {
      return false;
    }

    // Check priority filter
    if (config.priorities && config.priorities.length > 0 && !config.priorities.includes(ticket.priority)) {
      return false;
    }

    // Check category filter
    if (config.category && config.category !== '' && ticket.categoryId !== config.category) {
      return false;
    }

    return true;
  }

  /**
   * Scheduled job to check SLA timers and trigger time-based workflows
   */
  static async checkSLATimers() {
    try {
      console.log('[Workflow Trigger] Checking SLA timers...');

      // Find all running timers that are approaching breach
      const timers = await prisma.sLATimer.findMany({
        where: {
          status: 'running',
        },
        include: {
          conversation: true,
        },
      });

      for (const timer of timers) {
        // Calculate percentage remaining
        const percentRemaining = timer.remainingTime / timer.targetTime;

        // Find workflows with time-based triggers at this threshold
        const workflows = await prisma.sLAWorkflow.findMany({
          where: {
            isActive: true,
            isDraft: false,
          },
        });

        for (const workflow of workflows) {
          try {
            const workflowData = JSON.parse(workflow.workflowData);
            const { nodes } = workflowData;

            // Check if workflow has time_scheduler trigger
            const triggerNode = nodes.find(node => node.data.id === 'time_scheduler');
            
            if (!triggerNode) continue;

            // Build execution context
            const context = {
              conversationId: timer.conversationId,
              priority: timer.conversation.priority,
              status: timer.conversation.status,
              ticket: timer.conversation,
              timer: timer,
              percentRemaining: percentRemaining,
              policyId: workflow.policyId,
              event: 'time_check',
            };

            // Execute workflow
            await WorkflowExecutor.executeWorkflow(workflow.id, context);

          } catch (error) {
            console.error(`[Workflow Trigger] Error processing timer workflow ${workflow.id}:`, error);
          }
        }

        // Update timer (decrease remaining time)
        // This would be done by your SLA monitoring service
      }

      return { success: true, message: 'SLA timers checked' };
    } catch (error) {
      console.error('[Workflow Trigger] checkSLATimers error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default WorkflowTriggers;

