import prisma from '../../../../lib/prisma';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { ticketId, transferToId, transferToType, reason, agentId } = req.body;

        // Validate required fields
        if (!ticketId || !transferToId || !transferToType || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: ticketId, transferToId, transferToType, reason',
            });
        }

        if (!['agent', 'admin'].includes(transferToType)) {
            return res.status(400).json({
                success: false,
                message: 'transferToType must be either "agent" or "admin"',
            });
        }

        // Fetch the ticket to verify it exists
        const ticket = await prisma.conversation.findUnique({
            where: { ticketNumber: ticketId },
            include: {
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

        // Get current agent info (transferring agent)
        let transferringAgent = null;
        if (agentId) {
            transferringAgent = await prisma.agent.findUnique({
                where: { id: agentId },
                select: {
                    id: true,
                    name: true,
                },
            });
        }

        // Verify the recipient exists
        let recipient = null;
        let recipientName = '';
        let recipientType = transferToType;

        if (transferToType === 'agent') {
            recipient = await prisma.agent.findUnique({
                where: { id: transferToId },
                select: {
                    id: true,
                    name: true,
                    userId: true,
                    accountId: true,
                },
            });

            if (!recipient) {
                return res.status(404).json({
                    success: false,
                    message: 'Agent not found',
                });
            }
            recipientName = recipient.name;
        } else if (transferToType === 'admin') {
            recipient = await prisma.admin.findUnique({
                where: { id: transferToId },
                select: {
                    id: true,
                    name: true,
                },
            });

            if (!recipient) {
                return res.status(404).json({
                    success: false,
                    message: 'Admin not found',
                });
            }
            recipientName = recipient.name;
        }

        // Check if transferring to the same agent
        if (transferToType === 'agent' && ticket.assigneeId === transferToId) {
            return res.status(400).json({
                success: false,
                message: 'Ticket is already assigned to this agent',
            });
        }

        // Update the ticket assignee (only for agent transfers)
        let updatedTicket;
        if (transferToType === 'agent') {
            updatedTicket = await prisma.conversation.update({
                where: { ticketNumber: ticketId },
                data: {
                    assigneeId: transferToId,
                    updatedAt: new Date(),
                },
                include: {
                    assignee: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });
        } else {
            // For admin transfers, we might not update assigneeId
            // This depends on your business logic
            updatedTicket = ticket;
        }

        // Create ticket activity record
        const activity = await prisma.ticketActivity.create({
            data: {
                conversationId: ticketId,
                activityType: 'transfer',
                oldValue: ticket.assigneeId || 'Unassigned',
                newValue: transferToId,
                performedBy: transferToType === 'agent' ? 'agent' : 'admin',
                performedByName: transferringAgent?.name || 'Agent',
                reason: reason,
                createdAt: new Date(),
            },
        });

        // Create notification for the recipient
        // For agents: use accountId which links to the User table
        // For admins: use the admin id directly
        const notificationUserId = transferToType === 'agent'
            ? recipient.accountId  // accountId is the User.id for agents
            : recipient.id;

        console.log('Creating notification for:', {
            transferToType,
            recipientId: recipient.id,
            recipientName: recipient.name,
            notificationUserId,
            accountId: recipient.accountId
        });

        const notification = await prisma.notification.create({
            data: {
                userId: notificationUserId,
                type: 'ticket_transfer',
                title: `Transferred by ${transferringAgent?.name || 'Agent'}`,
                message: `Ticket #${ticketId} has been transferred to you. Subject: ${ticket.subject || 'No subject'}`,
                link: transferToType === 'agent'
                    ? `/agent/notifications` // Changed to notifications page
                    : `/admin/notifications`,
                read: false,
                metadata: JSON.stringify({
                    ticketId,
                    ticketSubject: ticket.subject,
                    transferReason: reason,
                    transferredBy: transferringAgent?.name || 'Agent',
                    transferredAt: new Date().toISOString(),
                }),
                createdAt: new Date(),
            },
        });

        return res.status(200).json({
            success: true,
            message: `Ticket transferred to ${recipientName} successfully`,
            ticket: updatedTicket,
            activity,
            notification,
        });
    } catch (error) {
        console.error('Error transferring ticket:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to transfer ticket',
            error: error.message,
        });
    }
}
