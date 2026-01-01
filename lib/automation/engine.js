/**
 * Automation Engine - Zoho-style Linear Rule Engine
 * 
 * This engine evaluates workflows based on triggers and conditions,
 * then executes actions when conditions match.
 * 
 * Architecture:
 * - Simple AND logic: All conditions must be true for workflow to execute
 * - Sequential action execution: Actions run in order
 * - Fail-safe: Automation errors don't block ticket operations
 */

import prisma from '../prisma';

/**
 * Run automation for a given ticket and trigger type
 * @param {object} ticket - The ticket/conversation object
 * @param {string} triggerType - Trigger type (e.g., "TICKET_CREATED", "TICKET_UPDATED", "TICKET_ASSIGNED")
 * @returns {Promise<void>}
 */
export async function runAutomation(ticket, triggerType) {
  try {
    // 1. Fetch active workflows for this trigger
    const workflows = await prisma.workflow.findMany({
      where: {
        trigger: triggerType,
        isActive: true,
      },
      include: {
        conditions: true,
        actions: {
          orderBy: {
            order: 'asc', // Execute actions in order
          },
        },
      },
    });

    if (workflows.length === 0) {
      return; // No workflows to process
    }

    console.log(`[Automation] Found ${workflows.length} active workflow(s) for trigger: ${triggerType}`);

    // 2. Evaluate each workflow
    for (const workflow of workflows) {
      const isMatch = checkConditions(ticket, workflow.conditions);

      if (isMatch) {
        console.log(`[Automation] Workflow "${workflow.name}" matched for ticket ${ticket.ticketNumber || ticket.id}`);
        await executeActions(ticket, workflow.actions, workflow.id);
      } else {
        console.log(`[Automation] Workflow "${workflow.name}" did not match conditions`);
      }
    }
  } catch (error) {
    // Fail-safe: Don't let automation errors break ticket operations
    console.error(`[Automation] Error running automation for trigger ${triggerType}:`, error);
  }
}

/**
 * Match a single condition against a ticket
 * Uses safe lowercase comparison for strings
 * 
 * @param {object} condition - WorkflowCondition object
 * @param {object} ticket - The ticket/conversation object
 * @returns {boolean} - True if condition matches
 */
export function matchCondition(condition, ticket) {
  const ticketValue = getFieldValue(ticket, condition.field);
  
  // Normalize string values to lowercase for safe comparison
  const normalizedTicketValue = typeof ticketValue === "string"
    ? ticketValue.toLowerCase()
    : ticketValue;
  
  const normalizedConditionValue = typeof condition.value === "string"
    ? condition.value.toLowerCase()
    : condition.value;

  switch (condition.operator.toLowerCase()) {
    case "equals":
      return normalizedTicketValue === normalizedConditionValue;

    case "not_equals":
      return normalizedTicketValue !== normalizedConditionValue;

    case "in":
      // Support comma-separated values
      const valueList = String(condition.value || "").toLowerCase().split(",").map(v => v.trim());
      return valueList.includes(String(normalizedTicketValue));

    case "changed":
      // Requires _changedFields tracking passed from the hook
      return ticket._changedFields?.includes(condition.field) || false;

    case "contains":
      return String(normalizedTicketValue || "").includes(String(normalizedConditionValue || ""));

    case "not_contains":
      return !String(normalizedTicketValue || "").includes(String(normalizedConditionValue || ""));

    case "greater_than":
    case ">":
      return Number(ticketValue) > Number(condition.value);

    case "less_than":
    case "<":
      return Number(ticketValue) < Number(condition.value);

    case "greater_than_or_equal":
    case ">=":
      return Number(ticketValue) >= Number(condition.value);

    case "less_than_or_equal":
    case "<=":
      return Number(ticketValue) <= Number(condition.value);

    case "is_empty":
    case "is_null":
      return ticketValue === null || ticketValue === undefined || ticketValue === "";

    case "is_not_empty":
    case "is_not_null":
      return ticketValue !== null && ticketValue !== undefined && ticketValue !== "";

    default:
      console.warn(`[Automation] Unknown operator: ${condition.operator}`);
      return false;
  }
}

/**
 * Check if all conditions match for a ticket
 * Uses AND logic: All conditions must be true
 * 
 * @param {object} ticket - The ticket/conversation object
 * @param {Array} conditions - Array of WorkflowCondition objects
 * @returns {boolean} - True if all conditions match
 */
function checkConditions(ticket, conditions) {
  if (!conditions || conditions.length === 0) {
    // No conditions = always match
    return true;
  }

  // AND logic: All conditions must be true
  return conditions.every((condition) => matchCondition(condition, ticket));
}

/**
 * Get field value from ticket object (supports nested fields)
 * @param {object} ticket - The ticket object
 * @param {string} field - Field path (e.g., "status", "assignee.name")
 * @returns {any} - Field value or null
 */
function getFieldValue(ticket, field) {
  if (!ticket || !field) {
    return null;
  }

  // Handle nested fields (e.g., "assignee.name")
  const parts = field.split('.');
  let value = ticket;

  for (const part of parts) {
    if (value === null || value === undefined) {
      return null;
    }
    value = value[part];
  }

  return value;
}

/**
 * Execute actions for a matched workflow
 * @param {object} ticket - The ticket/conversation object
 * @param {Array} actions - Array of WorkflowAction objects
 * @param {string} workflowId - Workflow ID for logging
 * @returns {Promise<void>}
 */
async function executeActions(ticket, actions, workflowId) {
  if (!actions || actions.length === 0) {
    console.log(`[Automation] No actions to execute for workflow ${workflowId}`);
    return;
  }

  const ticketId = ticket.ticketNumber || ticket.id;

  for (const action of actions) {
    try {
      console.log(`[Automation] Executing action: ${action.actionType} on ticket ${ticketId}`);

      let payload = {};
      try {
        payload = action.payload ? JSON.parse(action.payload) : {};
      } catch (parseError) {
        console.error(`[Automation] Failed to parse action payload:`, parseError);
        continue;
      }

      switch (action.actionType.toUpperCase()) {
        case 'ASSIGN_AGENT':
          await executeAssignAgent(ticketId, payload);
          break;

        case 'UPDATE_STATUS':
          await executeUpdateStatus(ticketId, payload);
          break;

        case 'SET_PRIORITY':
          await executeSetPriority(ticketId, payload);
          break;

        case 'ADD_TAG':
          await executeAddTag(ticketId, payload);
          break;

        case 'SEND_EMAIL':
          await executeSendEmail(ticketId, payload);
          break;

        case 'SEND_NOTIFICATION':
          await executeSendNotification(ticketId, payload);
          break;

        case 'UPDATE_FIELD':
          await executeUpdateField(ticketId, payload);
          break;

        default:
          console.warn(`[Automation] Unknown action type: ${action.actionType}`);
      }
    } catch (actionError) {
      // Continue with next action even if one fails
      console.error(`[Automation] Error executing action ${action.actionType}:`, actionError);
    }
  }
}

/**
 * Execute ASSIGN_AGENT action
 * @param {string} ticketId - Ticket number/ID
 * @param {object} payload - { agentId: string }
 */
async function executeAssignAgent(ticketId, payload) {
  if (!payload.agentId) {
    console.warn(`[Automation] ASSIGN_AGENT: Missing agentId in payload`);
    return;
  }

  await prisma.conversation.update({
    where: { ticketNumber: ticketId },
    data: { assigneeId: payload.agentId },
  });

  console.log(`[Automation] Assigned ticket ${ticketId} to agent ${payload.agentId}`);
}

/**
 * Execute UPDATE_STATUS action
 * @param {string} ticketId - Ticket number/ID
 * @param {object} payload - { status: string }
 */
async function executeUpdateStatus(ticketId, payload) {
  if (!payload.status) {
    console.warn(`[Automation] UPDATE_STATUS: Missing status in payload`);
    return;
  }

  await prisma.conversation.update({
    where: { ticketNumber: ticketId },
    data: { status: payload.status },
  });

  console.log(`[Automation] Updated ticket ${ticketId} status to ${payload.status}`);
}

/**
 * Execute SET_PRIORITY action
 * @param {string} ticketId - Ticket number/ID
 * @param {object} payload - { priority: string }
 */
async function executeSetPriority(ticketId, payload) {
  if (!payload.priority) {
    console.warn(`[Automation] SET_PRIORITY: Missing priority in payload`);
    return;
  }

  await prisma.conversation.update({
    where: { ticketNumber: ticketId },
    data: { priority: payload.priority },
  });

  console.log(`[Automation] Set ticket ${ticketId} priority to ${payload.priority}`);
}

/**
 * Execute ADD_TAG action
 * @param {string} ticketId - Ticket number/ID
 * @param {object} payload - { tagName: string } or { tagId: string }
 */
async function executeAddTag(ticketId, payload) {
  // Implementation depends on your tag system
  // This is a placeholder - implement based on your Tag model
  console.log(`[Automation] ADD_TAG: Not yet implemented for ticket ${ticketId}`);
}

/**
 * Execute SEND_EMAIL action
 * @param {string} ticketId - Ticket number/ID
 * @param {object} payload - { to: string, subject: string, body: string }
 */
async function executeSendEmail(ticketId, payload) {
  // Implementation depends on your email service
  // This is a placeholder - implement based on your email service
  console.log(`[Automation] SEND_EMAIL: Not yet implemented for ticket ${ticketId}`);
}

/**
 * Execute SEND_NOTIFICATION action
 * @param {string} ticketId - Ticket number/ID
 * @param {object} payload - { userId: string, title: string, message: string }
 */
async function executeSendNotification(ticketId, payload) {
  if (!payload.userId || !payload.title || !payload.message) {
    console.warn(`[Automation] SEND_NOTIFICATION: Missing required fields`);
    return;
  }

  await prisma.notification.create({
    data: {
      userId: payload.userId,
      type: 'automation',
      title: payload.title,
      message: payload.message,
      link: `/admin/tickets/${ticketId}`,
    },
  });

  console.log(`[Automation] Sent notification to user ${payload.userId} for ticket ${ticketId}`);
}

/**
 * Execute UPDATE_FIELD action (generic field update)
 * @param {string} ticketId - Ticket number/ID
 * @param {object} payload - { field: string, value: any }
 */
async function executeUpdateField(ticketId, payload) {
  if (!payload.field) {
    console.warn(`[Automation] UPDATE_FIELD: Missing field in payload`);
    return;
  }

  const updateData = {
    [payload.field]: payload.value,
  };

  await prisma.conversation.update({
    where: { ticketNumber: ticketId },
    data: updateData,
  });

  console.log(`[Automation] Updated ticket ${ticketId} field ${payload.field} to ${payload.value}`);
}

export default {
  runAutomation,
};

