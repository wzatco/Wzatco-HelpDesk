import prisma from '../../../lib/prisma';
import { getCurrentAgentId } from '../../../lib/utils/agent-auth';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
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

        // Fetch all active departments with department head info and ticket counts
        const departments = await prisma.department.findMany({
            where: {
                isActive: true,
            },
            include: {
                departmentHead: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        routedTickets: {
                            where: {
                                status: {
                                    not: 'closed',
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });

        // Transform the data for frontend
        const formattedDepartments = departments.map(dept => ({
            id: dept.id,
            name: dept.name,
            description: dept.description || 'No description provided',
            departmentHeadId: dept.departmentHeadId,
            departmentHeadName: dept.departmentHead?.name || 'No head assigned',
            departmentHeadEmail: dept.departmentHead?.email,
            ticketCount: dept._count.routedTickets,
        }));

        return res.status(200).json({
            success: true,
            departments: formattedDepartments,
        });
    } catch (error) {
        console.error('Error fetching departments:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch departments',
        });
    }
}
