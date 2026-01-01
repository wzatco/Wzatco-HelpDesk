import prisma, { ensurePrismaConnected } from '../../../../../lib/prisma';
import { getCurrentAgent } from '../../../../../lib/utils/agent-auth';

/**
 * POST /api/agent/tickets/[id]/escalate
 * Escalates a ticket to Team Leader with reason
 * 
 * Body: { reason: string, escalateToLeader?: boolean }
 * - If escalateToLeader is true (default), finds Team Leader in ticket's department
 * - If no Team Leader found, falls back to Admin notification
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await ensurePrismaConnected();

  const agent = await getCurrentAgent(req);
  if (!agent) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  const { reason, escalateToLeader = true, priority } = req.body;

  if (!reason?.trim()) {
    return res.status(400).json({ error: 'Reason is required' });
  }

  // Validate priority if provided
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  const requestedPriority = priority || 'urgent'; // Default to urgent if not specified
  if (!validPriorities.includes(requestedPriority)) {
    return res.status(400).json({ error: 'Invalid priority. Must be one of: low, medium, high, urgent' });
  }

  try {
    // Get current ticket with department info (including departmentHead)
    const ticket = await prisma.conversation.findUnique({
      where: { ticketNumber: id },
      include: {
        department: {
          include: {
            departmentHead: {
              select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                role: {
                  select: {
                    id: true,
                    title: true,
                    displayAs: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const oldPriority = ticket.priority || 'low';
    const newPriority = requestedPriority; // Use the priority from request (or default to urgent)

    let teamLeader = null;
    let escalationTarget = null;
    let escalationNote = '';

    // Find Team Leader if escalation is requested
    if (escalateToLeader && ticket.departmentId) {
      // PRIORITY 1: Check explicit Department Head (highest priority)
      // Department Head is now an Agent, so we can use it directly
      if (ticket.department?.departmentHead && ticket.department.departmentHead.isActive) {
        const departmentHead = ticket.department.departmentHead;
        
        // Department Head is already an Agent, so assign directly
        teamLeader = departmentHead;
        escalationTarget = teamLeader;
        escalationNote = `Escalated to Department Head: ${teamLeader.name}${teamLeader.role?.title ? ` (${teamLeader.role.title})` : ''}`;
      }

      // PRIORITY 2: Fallback to role-based search (only if no explicit department head found)
      if (!teamLeader) {
        // Search for Team Leader in the ticket's department by role title
        // Try multiple role title variations
        const teamLeaderTitles = ['Team Leader', 'Team Lead', 'Supervisor', 'Manager'];
        
        // Search for Agents with matching role titles
        for (const title of teamLeaderTitles) {
          teamLeader = await prisma.agent.findFirst({
            where: {
              departmentId: ticket.departmentId,
              isActive: true,
              role: {
                title: title
              }
            },
            include: {
              role: {
                select: {
                  id: true,
                  title: true,
                  displayAs: true
                }
              }
            }
          });

          if (teamLeader) {
            escalationTarget = teamLeader;
            escalationNote = `Escalated to ${teamLeader.role?.displayAs || teamLeader.role?.title || 'Team Leader'}: ${teamLeader.name}`;
            break;
          }
        }
      }
    }

    // Fallback: If no Team Leader found, find any admin or supervisor
    if (!teamLeader) {
      // Try to find any agent with hasSuperPower role in the department
      if (ticket.departmentId) {
        teamLeader = await prisma.agent.findFirst({
          where: {
            departmentId: ticket.departmentId,
            isActive: true,
            role: {
              hasSuperPower: true
            }
          },
          include: {
            role: {
              select: {
                id: true,
                title: true,
                displayAs: true
              }
            }
          }
        });
      }

      // If still no leader, find any active agent with hasSuperPower role (global fallback)
      if (!teamLeader) {
        teamLeader = await prisma.agent.findFirst({
          where: {
            isActive: true,
            role: {
              hasSuperPower: true
            }
          },
          include: {
            role: {
              select: {
                id: true,
                title: true,
                displayAs: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc' // Get the first admin created
          }
        });
      }

      if (teamLeader) {
        escalationTarget = teamLeader;
        escalationNote = `Escalated to ${teamLeader.role?.displayAs || teamLeader.role?.title || 'Administrator'}: ${teamLeader.name}`;
      } else {
        escalationNote = 'Escalated - No Team Leader found in department. Ticket requires manual assignment.';
      }
    }

    // Prepare update data
    const updateData = {
      priority: newPriority
    };

    // Assign to Team Leader if found
    if (teamLeader) {
      updateData.assigneeId = teamLeader.id;
      // Auto-update departmentId to match Team Leader's department (if different)
      if (teamLeader.departmentId && teamLeader.departmentId !== ticket.departmentId) {
        updateData.departmentId = teamLeader.departmentId;
      }
    }

    // Update ticket
    await prisma.conversation.update({
      where: { ticketNumber: id },
      data: updateData
    });

    // Log activity
    await prisma.ticketActivity.create({
      data: {
        conversationId: id,
        activityType: 'escalated',
        oldValue: oldPriority,
        newValue: newPriority,
        performedBy: 'agent',
        performedByName: agent.name,
        reason: reason.trim()
      }
    });

    // Create escalation note
    const noteContent = `${escalationNote}\n\nReason for Escalation: ${reason.trim()}\n\nEscalated by: ${agent.name}`;
    
    await prisma.ticketNote.create({
      data: {
        conversationId: id,
        content: noteContent,
        isPrivate: false,
        createdById: agent.id,
        createdByName: agent.name
      }
    });

    // Emit socket event if Team Leader was assigned
    if (teamLeader) {
      try {
        const { initialize } = await import('../../../../../lib/chat-service');
        const chatService = initialize();
        
        if (chatService) {
          chatService.emitTicketAssignment({
            ticketId: id,
            assigneeId: teamLeader.id,
            assigneeName: teamLeader.name,
            assignedBy: `Escalation from ${agent.name}`,
            ticket: {
              ticketNumber: id,
              subject: ticket.subject,
              priority: newPriority
            }
          });
        }
      } catch (socketError) {
        console.error('Error emitting escalation socket event:', socketError);
        // Don't fail the request if socket emission fails
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: teamLeader 
        ? `Ticket escalated to ${teamLeader.name} (${teamLeader.role?.title || 'Team Leader'})`
        : 'Ticket escalated. No Team Leader found - requires manual assignment.',
      priority: newPriority,
      assignedTo: teamLeader ? {
        id: teamLeader.id,
        name: teamLeader.name,
        role: teamLeader.role?.title || 'Team Leader'
      } : null
    });
  } catch (error) {
    console.error('Error escalating ticket:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
