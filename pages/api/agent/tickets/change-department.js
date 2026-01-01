import prisma from '../../../../lib/prisma';
import { getCurrentAgentId } from '../../../../lib/utils/agent-auth';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const agentId = await getCurrentAgentId(req);

        if (!agentId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        const { ticketId, departmentId, reason } = req.body;

        // Validation
        if (!ticketId || !departmentId || !reason?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: ticketId, departmentId, and reason are required',
            });
        }

        console.log('[Department Change] Request:', { ticketId, departmentId, agentId });

        // Fetch the ticket
        const ticket = await prisma.conversation.findUnique({
            where: { ticketNumber: ticketId },
            include: {
                department: true,
                assignee: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found',
            });
        }

        // Check if trying to change to the same department
        if (ticket.departmentId === departmentId) {
            return res.status(400).json({
                success: false,
                message: 'Ticket is already in this department',
            });
        }

        // Fetch the new department with department head info
        const newDepartment = await prisma.department.findUnique({
            where: { id: departmentId },
            include: {
                departmentHead: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!newDepartment) {
            return res.status(404).json({
                success: false,
                message: 'Department not found',
            });
        }

        if (!newDepartment.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Cannot transfer to inactive department',
            });
        }

        // Get the agent who is making the change
        const changingAgent = await prisma.agent.findUnique({
            where: { id: agentId },
            select: {
                id: true,
                name: true,
                accountId: true,
            },
        });

        if (!changingAgent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found',
            });
        }

        // Update the ticket's department
        await prisma.conversation.update({
            where: { ticketNumber: ticketId },
            data: {
                departmentId: departmentId,
                updatedAt: new Date(),
            },
        });

        console.log('[Department Change] Ticket updated:', ticketId);

        // Create ticket activity record
        await prisma.ticketActivity.create({
            data: {
                conversationId: ticketId,
                activityType: 'department_change',
                oldValue: ticket.department?.name || 'Unassigned',
                newValue: newDepartment.name,
                performedBy: agentId,
                performedByName: changingAgent.name,
                reason: reason.trim(),
                createdAt: new Date(),
            },
        });

        console.log('[Department Change] Activity logged');

        // Create notification for department head (if assigned)
        if (newDepartment.departmentHeadId) {
            const notification = await prisma.notification.create({
                data: {
                    userId: newDepartment.departmentHeadId,
                    type: 'department_change',
                    title: 'Ticket transferred to your department',
                    message: `Ticket #${ticketId} has been moved to ${newDepartment.name} by ${changingAgent.name}`,
                    link: `/admin/tickets/${ticketId}`,
                    read: false,
                    metadata: JSON.stringify({
                        ticketId,
                        ticketSubject: ticket.subject,
                        departmentName: newDepartment.name,
                        changedBy: changingAgent.name,
                        reason: reason.trim(),
                        changedAt: new Date().toISOString(),
                    }),
                    createdAt: new Date(),
                },
            });

            console.log('[Department Change] Notification created for department head:', notification.id);
        } else {
            console.log('[Department Change] No department head assigned, skipping notification');
        }

        return res.status(200).json({
            success: true,
            message: 'Department changed successfully',
            data: {
                ticketId,
                oldDepartment: ticket.department?.name || 'Unassigned',
                newDepartment: newDepartment.name,
            },
        });
    } catch (error) {
        console.error('[Department Change] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to change department',
            error: error.message,
        });
    }
}
