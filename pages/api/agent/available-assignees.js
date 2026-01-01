import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        // Fetch all active agents with their departments and open ticket counts
        const agents = await prisma.agent.findMany({
            where: {
                isActive: true,
            },
            include: {
                department: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                assignedConversations: {
                    where: {
                        status: {
                            in: ['open', 'pending', 'waiting'],
                        },
                    },
                    select: {
                        ticketNumber: true,
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });

        // Fetch all active admins with open ticket counts
        const admins = await prisma.admin.findMany({
            where: {
                // Assuming admins don't have an isActive field, or adjust as needed
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
            },
            orderBy: {
                name: 'asc',
            },
        });

        // Get admin open ticket counts (tickets assigned to admins via customerId or other logic)
        // Note: Based on your schema, admins don't have direct ticket assignments
        // You may want to adjust this based on your business logic
        const adminOpenTicketCounts = await Promise.all(
            admins.map(async (admin) => {
                // Placeholder: count tickets where admin is somehow involved
                // Adjust this query based on your actual admin-ticket relationship
                const count = 0; // Since admins don't have assignedConversations in your schema
                return count;
            })
        );

        // Transform agents data
        const agentsData = agents.map(agent => ({
            id: agent.id,
            name: agent.name,
            email: agent.email,
            avatarUrl: null, // Agents don't have direct avatarUrl in schema
            department: agent.department ? {
                id: agent.department.id,
                name: agent.department.name,
            } : null,
            openTicketCount: agent.assignedConversations.length,
        }));

        // Transform admins data
        const adminsData = admins.map((admin, index) => ({
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role || 'Admin',
            avatarUrl: admin.avatarUrl,
            openTicketCount: adminOpenTicketCounts[index],
        }));

        return res.status(200).json({
            success: true,
            agents: agentsData,
            admins: adminsData,
        });
    } catch (error) {
        console.error('Error fetching available assignees:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch available assignees',
        });
    }
}
