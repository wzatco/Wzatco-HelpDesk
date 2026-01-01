import prisma, { ensurePrismaConnected } from '../../../../lib/prisma';
import { calculateAgentTAT } from '../../../../lib/utils/tat';

export default async function handler(req, res) {
  // Ensure Prisma is connected before proceeding
  await ensurePrismaConnected();

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.createdAt.lte = new Date(endDate);
      }
    }

    // Get all tickets with productId or productModel (for backward compatibility)
    const tickets = await prisma.conversation.findMany({
      where: {
        ...dateFilter,
        OR: [
          { productId: { not: null } },
          { productModel: { not: null } }
        ]
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        accessory: {
          select: {
            id: true,
            name: true
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1
        },
        activities: {
          where: {
            activityType: 'status_changed',
            newValue: 'resolved'
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    // Pre-calculate active times for all resolved/closed tickets in parallel
    const resolvedClosedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
    const activeTimeMap = new Map();
    
    await Promise.all(resolvedClosedTickets.map(async (ticket) => {
      try {
        const activeSeconds = await calculateAgentTAT(prisma, ticket.ticketNumber);
        activeTimeMap.set(ticket.ticketNumber, activeSeconds);
      } catch (error) {
        console.error(`Error calculating active time for ticket ${ticket.ticketNumber}:`, error);
        activeTimeMap.set(ticket.ticketNumber, 0);
      }
    }));

    // Group by product (using productId if available, fallback to productModel)
    const productStats = {};
    const accessoryStats = {};
    
    tickets.forEach(ticket => {
      // Use productId/product relation if available, otherwise fallback to productModel
      const productName = ticket.product?.name || ticket.productModel || 'Unknown';
      const productId = ticket.productId || null;
      const accessoryName = ticket.accessory?.name || null;
      const accessoryId = ticket.accessoryId || null;
      
      // Product-level stats
      const productKey = productId || productName;
      if (!productStats[productKey]) {
        productStats[productKey] = {
          productId: productId,
          productName: productName,
          productModel: productName, // Keep for backward compatibility
          category: ticket.product?.category || null,
          totalTickets: 0,
          openTickets: 0,
          pendingTickets: 0,
          resolvedTickets: 0,
          closedTickets: 0,
          totalResolutionTime: 0,
          resolvedCount: 0,
          averageResolutionTime: 0,
          totalActiveSeconds: 0, // Sum of active time from worklogs
          activeTicketCount: 0, // Count of tickets with >0 active time
          issues: [],
          accessories: {} // Track accessories for this product
        };
      }

      productStats[productKey].totalTickets++;
      
      // Count by status
      if (ticket.status === 'open') productStats[productKey].openTickets++;
      else if (ticket.status === 'pending') productStats[productKey].pendingTickets++;
      else if (ticket.status === 'resolved') productStats[productKey].resolvedTickets++;
      else if (ticket.status === 'closed') productStats[productKey].closedTickets++;

      // Calculate resolution time (Calendar Time)
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        const resolvedActivity = ticket.activities[0];
        if (resolvedActivity) {
          const createdTime = ticket.createdAt.getTime();
          const resolvedTime = resolvedActivity.createdAt.getTime();
          const resolutionTimeHours = (resolvedTime - createdTime) / (1000 * 60 * 60);
          
          productStats[productKey].totalResolutionTime += resolutionTimeHours;
          productStats[productKey].resolvedCount++;
        }
        
        // Add active time (Actual Work Time)
        const activeSeconds = activeTimeMap.get(ticket.ticketNumber) || 0;
        if (activeSeconds > 0) {
          productStats[productKey].totalActiveSeconds += activeSeconds;
          productStats[productKey].activeTicketCount++;
        }
      }

      // Collect issues (from subject or first message)
      const issue = ticket.subject || ticket.messages[0]?.content?.substring(0, 100) || 'No description';
      if (!productStats[productKey].issues.includes(issue)) {
        productStats[productKey].issues.push(issue);
      }

      // Accessory-level stats (if accessory exists)
      if (accessoryId && accessoryName) {
        const accessoryKey = `${productKey}_${accessoryId}`;
        if (!accessoryStats[accessoryKey]) {
          accessoryStats[accessoryKey] = {
          accessoryId: accessoryId,
          accessoryName: accessoryName,
          productId: productId,
          productName: productName,
          totalTickets: 0,
          openTickets: 0,
          pendingTickets: 0,
          resolvedTickets: 0,
          closedTickets: 0,
          totalResolutionTime: 0,
          resolvedCount: 0,
          averageResolutionTime: 0,
          totalActiveSeconds: 0, // Sum of active time from worklogs
          activeTicketCount: 0 // Count of tickets with >0 active time
          };
        }

        accessoryStats[accessoryKey].totalTickets++;
        
        // Count by status
        if (ticket.status === 'open') accessoryStats[accessoryKey].openTickets++;
        else if (ticket.status === 'pending') accessoryStats[accessoryKey].pendingTickets++;
        else if (ticket.status === 'resolved') accessoryStats[accessoryKey].resolvedTickets++;
        else if (ticket.status === 'closed') accessoryStats[accessoryKey].closedTickets++;

        // Calculate resolution time for accessory (Calendar Time)
        if (ticket.status === 'resolved' || ticket.status === 'closed') {
          const resolvedActivity = ticket.activities[0];
          if (resolvedActivity) {
            const createdTime = ticket.createdAt.getTime();
            const resolvedTime = resolvedActivity.createdAt.getTime();
            const resolutionTimeHours = (resolvedTime - createdTime) / (1000 * 60 * 60);
            
            accessoryStats[accessoryKey].totalResolutionTime += resolutionTimeHours;
            accessoryStats[accessoryKey].resolvedCount++;
          }
          
          // Add active time (Actual Work Time)
          const activeSeconds = activeTimeMap.get(ticket.ticketNumber) || 0;
          if (activeSeconds > 0) {
            accessoryStats[accessoryKey].totalActiveSeconds += activeSeconds;
            accessoryStats[accessoryKey].activeTicketCount++;
          }
        }

        // Track accessory in product stats
        if (!productStats[productKey].accessories[accessoryId]) {
          productStats[productKey].accessories[accessoryId] = {
            accessoryId: accessoryId,
            accessoryName: accessoryName,
            totalTickets: 0
          };
        }
        productStats[productKey].accessories[accessoryId].totalTickets++;
      }
    });

    // Calculate average resolution time and active time for products
    Object.keys(productStats).forEach(product => {
      const stats = productStats[product];
      if (stats.resolvedCount > 0) {
        stats.averageResolutionTime = Math.round((stats.totalResolutionTime / stats.resolvedCount) * 100) / 100;
      }
      
      // Calculate active time metrics
      stats.totalActiveHours = Math.round((stats.totalActiveSeconds / 3600) * 100) / 100;
      stats.avgActiveHours = stats.resolvedCount > 0 
        ? Math.round((stats.totalActiveHours / stats.resolvedCount) * 100) / 100 
        : 0;
      
      // Convert accessories object to array
      stats.accessories = Object.values(stats.accessories);
    });

    // Calculate average resolution time and active time for accessories
    Object.keys(accessoryStats).forEach(accessory => {
      const stats = accessoryStats[accessory];
      if (stats.resolvedCount > 0) {
        stats.averageResolutionTime = Math.round((stats.totalResolutionTime / stats.resolvedCount) * 100) / 100;
      }
      
      // Calculate active time metrics
      stats.totalActiveHours = Math.round((stats.totalActiveSeconds / 3600) * 100) / 100;
      stats.avgActiveHours = stats.resolvedCount > 0 
        ? Math.round((stats.totalActiveHours / stats.resolvedCount) * 100) / 100 
        : 0;
    });

    // Convert to arrays and sort by total tickets
    const products = Object.values(productStats).sort((a, b) => b.totalTickets - a.totalTickets);
    const accessories = Object.values(accessoryStats).sort((a, b) => b.totalTickets - a.totalTickets);

    return res.status(200).json({
      success: true,
      data: products,
      accessories: accessories, // Include accessory analytics
      summary: {
        totalProducts: products.length,
        totalAccessories: accessories.length,
        totalTickets: tickets.length
      }
    });
  } catch (error) {
    console.error('Error fetching product analytics:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching product analytics',
      error: error.message 
    });
  }
}


