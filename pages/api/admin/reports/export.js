import prisma from '@/lib/prisma';

// Prisma singleton pattern
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper function to convert data to CSV
function arrayToCSV(data) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return 'No data available';
  }
  
  try {
    // Get headers from first object
    const firstRow = data[0];
    if (!firstRow || typeof firstRow !== 'object') {
      return 'Invalid data format';
    }
    
    const headers = Object.keys(firstRow);
    if (headers.length === 0) {
      return 'No columns available';
    }
    
    // Create CSV rows
    const rows = [
      headers.join(','), // Header row
      ...data.map(row => {
        if (!row || typeof row !== 'object') {
          return headers.map(() => '').join(',');
        }
        return headers.map(header => {
          const value = row[header];
          // Handle null, undefined, and other falsy values
          if (value === null || value === undefined) {
            return '';
          }
          // Escape commas, quotes, and newlines
          const str = String(value);
          if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',');
      })
    ];
    
    return rows.join('\n');
  } catch (error) {
    console.error('Error converting to CSV:', error);
    return `Error: ${error.message}`;
  }
}

// Helper to combine multiple CSV datasets with sheet names
function combineCSVSheets(sheets, metadata = null) {
  if (!sheets || !Array.isArray(sheets) || sheets.length === 0) {
    return 'No data available';
  }
  
  try {
    let result = '';
    
    // Add metadata header if provided
    if (metadata) {
      result += '=== REPORT METADATA ===\n';
      Object.keys(metadata).forEach(key => {
        result += `${key}: ${metadata[key]}\n`;
      });
      result += '\n';
    }
    
    // Add sheets
    result += sheets.map(({ name, data }) => {
      const csvContent = arrayToCSV(data);
      if (name) {
        return `=== ${name} ===\n\n${csvContent}`;
      }
      return csvContent;
    }).join('\n\n');
    
    return result;
  } catch (error) {
    console.error('Error combining CSV sheets:', error);
    return `Error combining sheets: ${error.message}`;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { startDate, endDate, type, format = 'excel' } = req.query;

    // Validate required parameters
    if (!type) {
      return res.status(400).json({ 
        success: false,
        message: 'Export type is required',
        error: 'Missing type parameter'
      });
    }

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        // Start of the day
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.createdAt.gte = start;
      }
      if (endDate) {
        // End of the day (include the full day)
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.lte = end;
      }
    }

    // Use CSV format only (more reliable)
    let csvSheets = []; // Array of { name: string, data: array }
    let filename = '';
    let csvContent = null;
    let metadata = null;

    if (type === 'products') {
      // Fetch detailed product data
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
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true
            }
          },
          activities: {
            where: {
              activityType: 'status_changed',
              newValue: 'resolved'
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Sheet 1: Product Summary
      const productStats = {};
      tickets.forEach(ticket => {
        const productName = ticket.product?.name || ticket.productModel || 'Unknown';
        const productId = ticket.productId || null;
        const productKey = productId || productName;

        if (!productStats[productKey]) {
          productStats[productKey] = {
            'Product ID': productId || 'N/A',
            'Product Name': productName,
            'Category': ticket.product?.category || 'N/A',
            'Model': ticket.productModel || 'N/A',
            'Total Tickets': 0,
            'Open Tickets': 0,
            'Pending Tickets': 0,
            'Resolved Tickets': 0,
            'Closed Tickets': 0,
            'Total Resolution Time (Hours)': 0,
            'Resolved Count': 0,
            'Average Resolution Time (Hours)': 0
          };
        }

        productStats[productKey]['Total Tickets']++;
        if (ticket.status === 'open') productStats[productKey]['Open Tickets']++;
        else if (ticket.status === 'pending') productStats[productKey]['Pending Tickets']++;
        else if (ticket.status === 'resolved') productStats[productKey]['Resolved Tickets']++;
        else if (ticket.status === 'closed') productStats[productKey]['Closed Tickets']++;

        if (ticket.status === 'resolved' || ticket.status === 'closed') {
          const resolvedActivity = ticket.activities[0];
          if (resolvedActivity) {
            const resolutionTimeHours = (resolvedActivity.createdAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
            productStats[productKey]['Total Resolution Time (Hours)'] += resolutionTimeHours;
            productStats[productKey]['Resolved Count']++;
          }
        }
      });

      Object.keys(productStats).forEach(key => {
        const stats = productStats[key];
        if (stats['Resolved Count'] > 0) {
          stats['Average Resolution Time (Hours)'] = Math.round((stats['Total Resolution Time (Hours)'] / stats['Resolved Count']) * 100) / 100;
        }
        delete stats['Total Resolution Time (Hours)'];
        delete stats['Resolved Count'];
      });

      const productSummary = Object.values(productStats).sort((a, b) => b['Total Tickets'] - a['Total Tickets']);
      csvSheets.push({ name: 'Product Summary', data: productSummary });

      // Sheet 2: Detailed Tickets
      const detailedTickets = tickets.map(ticket => {
        let resolutionTime = null;
        let firstResponseTime = null;
        if (ticket.status === 'resolved' || ticket.status === 'closed') {
          const resolvedActivity = ticket.activities[0];
          if (resolvedActivity) {
            resolutionTime = Math.round(((resolvedActivity.createdAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60)) * 100) / 100;
          }
        }
        
        // Calculate First Response Time
        if (ticket.messages && ticket.messages.length >= 2) {
          const customerMessage = ticket.messages.find(m => m.senderType === 'customer' || !m.senderType);
          const agentMessage = ticket.messages.find(m => m.senderType === 'agent');
          if (customerMessage && agentMessage) {
            firstResponseTime = Math.round(((agentMessage.createdAt.getTime() - customerMessage.createdAt.getTime()) / (1000 * 60 * 60)) * 100) / 100;
          }
        }

        return {
          'Ticket ID': ticket.ticketNumber || ticket.id,
          'Subject': ticket.subject || 'No Subject',
          'Status': ticket.status,
          'Priority': ticket.priority || 'low',
          'Product ID': ticket.productId || 'N/A',
          'Product Name': ticket.product?.name || ticket.productModel || 'N/A',
          'Product Category': ticket.product?.category || 'N/A',
          'Product Model': ticket.productModel || 'N/A',
          'Accessory ID': ticket.accessoryId || 'N/A',
          'Accessory Name': ticket.accessory?.name || 'N/A',
          'Customer ID': ticket.customerId || 'N/A',
          'Customer Name': ticket.customer?.name || ticket.customerName || 'Unknown',
          'Customer Email': ticket.customer?.email || 'N/A',
          'Customer Phone': ticket.customer?.phone || 'N/A',
          'Assignee ID': ticket.assigneeId || 'N/A',
          'Assignee Name': ticket.assignee?.name || 'Unassigned',
          'Assignee Email': ticket.assignee?.email || 'N/A',
          'Department': ticket.assignee?.department || 'N/A',
          'Created At': ticket.createdAt.toISOString(),
          'Updated At': ticket.updatedAt.toISOString(),
          'First Response Time (Hours)': firstResponseTime || 'N/A',
          'Resolution Time (Hours)': resolutionTime || 'N/A',
          'First Message Preview': ticket.messages[0]?.content?.substring(0, 300) || 'N/A',
          'Message Count': ticket.messages?.length || 0
        };
      });

      csvSheets.push({ name: 'Detailed Tickets', data: detailedTickets });

      // Add metadata
      metadata = {
        'Report Type': 'Product Analytics',
        'Start Date': startDate || 'All Time',
        'End Date': endDate || 'All Time',
        'Generated At': new Date().toISOString(),
        'Total Products': productSummary.length,
        'Total Tickets': detailedTickets.length
      };

      filename = `product-report-${startDate || 'all'}-${endDate || 'all'}.csv`;

    } else if (type === 'tat') {
      const tickets = await prisma.conversation.findMany({
        where: dateFilter,
        include: {
          activities: {
            where: {
              activityType: 'status_changed',
              newValue: 'resolved'
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true
            }
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
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
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const thresholdHours = 24;
      const now = new Date();

      const tatData = tickets.map(ticket => {
        let resolutionTimeHours = null;
        let exceeded = false;

        if (ticket.status === 'resolved' || ticket.status === 'closed') {
          const resolvedActivity = ticket.activities[0];
          if (resolvedActivity) {
            resolutionTimeHours = Math.round(((resolvedActivity.createdAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60)) * 100) / 100;
            exceeded = resolutionTimeHours > thresholdHours;
          }
        } else {
          resolutionTimeHours = Math.round(((now.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60)) * 100) / 100;
          exceeded = resolutionTimeHours > thresholdHours;
        }

        return {
          'Ticket ID': ticket.ticketNumber || ticket.id,
          'Subject': ticket.subject || 'No Subject',
          'Status': ticket.status,
          'Priority': ticket.priority || 'low',
          'Customer ID': ticket.customerId || 'N/A',
          'Customer Name': ticket.customer?.name || ticket.customerName || 'Unknown',
          'Customer Email': ticket.customer?.email || 'N/A',
          'Customer Phone': ticket.customer?.phone || 'N/A',
          'Product ID': ticket.productId || 'N/A',
          'Product Name': ticket.product?.name || ticket.productModel || 'N/A',
          'Product Category': ticket.product?.category || 'N/A',
          'Accessory ID': ticket.accessoryId || 'N/A',
          'Accessory Name': ticket.accessory?.name || 'N/A',
          'Assignee ID': ticket.assigneeId || 'N/A',
          'Assignee Name': ticket.assignee?.name || 'Unassigned',
          'Assignee Email': ticket.assignee?.email || 'N/A',
          'Department': ticket.assignee?.department || 'N/A',
          'Created At': ticket.createdAt.toISOString(),
          'Updated At': ticket.updatedAt.toISOString(),
          'Resolution Time (Hours)': resolutionTimeHours || 'N/A',
          'Threshold (Hours)': thresholdHours,
          'Exceeded Threshold': exceeded ? 'Yes' : 'No',
          'Days Since Creation': Math.round((now.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60 * 24) * 100) / 100,
          'Hours Since Creation': Math.round((now.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60) * 100) / 100
        };
      });

      csvSheets.push({ name: 'TAT Report', data: tatData });
      
      const exceededCount = tatData.filter(t => t['Exceeded Threshold'] === 'Yes').length;
      metadata = {
        'Report Type': 'TAT (Turnaround Time) Report',
        'Start Date': startDate || 'All Time',
        'End Date': endDate || 'All Time',
        'Generated At': new Date().toISOString(),
        'Threshold (Hours)': thresholdHours,
        'Total Tickets': tatData.length,
        'Exceeded Threshold': exceededCount,
        'Compliance Rate (%)': tatData.length > 0 ? Math.round(((tatData.length - exceededCount) / tatData.length) * 100) : 0
      };
      
      filename = `tat-report-${startDate || 'all'}-${endDate || 'all'}.csv`;

    } else if (type === 'agents') {
      const agents = await prisma.agent.findMany({
        where: { isActive: true },
        include: {
          assignedConversations: {
            where: dateFilter,
            include: {
              messages: {
                orderBy: { createdAt: 'asc' }
              },
              activities: {
                where: {
                  activityType: 'status_changed',
                  newValue: 'resolved'
                },
                orderBy: { createdAt: 'desc' },
                take: 1
              },
              customer: {
                select: {
                  name: true,
                  email: true
                }
              },
              product: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      // Sheet 1: Agent Summary
      const agentSummary = agents.map(agent => {
        const tickets = agent.assignedConversations;
        const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
        const open = tickets.filter(t => t.status === 'open');
        const pending = tickets.filter(t => t.status === 'pending');

        // Calculate FRT
        let totalFRT = 0;
        let frtCount = 0;
        tickets.forEach(ticket => {
          if (ticket.messages.length >= 2) {
            const customerMessage = ticket.messages[0];
            const agentMessage = ticket.messages.find(m => 
              m.senderType === 'agent' || m.senderId === agent.id
            );
            if (customerMessage && agentMessage) {
              const frt = (agentMessage.createdAt.getTime() - customerMessage.createdAt.getTime()) / (1000 * 60 * 60);
              totalFRT += frt;
              frtCount++;
            }
          }
        });
        const avgFRT = frtCount > 0 ? Math.round((totalFRT / frtCount) * 100) / 100 : 0;

        // Calculate resolution time
        let totalResTime = 0;
        let resCount = 0;
        resolved.forEach(ticket => {
          const act = ticket.activities[0];
          if (act) {
            totalResTime += (act.createdAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
            resCount++;
          }
        });
        const avgResTime = resCount > 0 ? Math.round((totalResTime / resCount) * 100) / 100 : 0;
        const resolutionRate = tickets.length > 0 ? Math.round((resolved.length / tickets.length) * 100) : 0;

        return {
          'Agent ID': agent.id,
          'Agent Name': agent.name,
          'Email': agent.email || 'N/A',
          'Department': agent.department || 'N/A',
          'Total Tickets': tickets.length,
          'Open Tickets': open.length,
          'Pending Tickets': pending.length,
          'Resolved Tickets': resolved.length,
          'Average FRT (Hours)': avgFRT,
          'Average Resolution Time (Hours)': avgResTime,
          'Resolution Rate (%)': resolutionRate
        };
      });

      csvSheets.push({ name: 'Agent Summary', data: agentSummary });

      // Sheet 2: Agent Ticket Details
      const agentTickets = [];
      agents.forEach(agent => {
        agent.assignedConversations.forEach(ticket => {
          let resolutionTime = null;
          if (ticket.status === 'resolved' || ticket.status === 'closed') {
            const act = ticket.activities[0];
            if (act) {
              resolutionTime = Math.round(((act.createdAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60)) * 100) / 100;
            }
          }

          // Calculate First Response Time
          let firstResponseTime = null;
          if (ticket.messages && ticket.messages.length >= 2) {
            const customerMessage = ticket.messages.find(m => m.senderType === 'customer' || !m.senderType);
            const agentMessage = ticket.messages.find(m => m.senderType === 'agent' || m.senderId === agent.id);
            if (customerMessage && agentMessage) {
              firstResponseTime = Math.round(((agentMessage.createdAt.getTime() - customerMessage.createdAt.getTime()) / (1000 * 60 * 60)) * 100) / 100;
            }
          }

          agentTickets.push({
            'Agent ID': agent.id,
            'Agent Name': agent.name,
            'Agent Email': agent.email || 'N/A',
            'Department': agent.department || 'N/A',
            'Ticket ID': ticket.ticketNumber || ticket.id,
            'Subject': ticket.subject || 'No Subject',
            'Status': ticket.status,
            'Priority': ticket.priority || 'low',
            'Customer ID': ticket.customerId || 'N/A',
            'Customer Name': ticket.customer?.name || ticket.customerName || 'Unknown',
            'Customer Email': ticket.customer?.email || 'N/A',
            'Product ID': ticket.productId || 'N/A',
            'Product Name': ticket.product?.name || ticket.productModel || 'N/A',
            'Product Category': ticket.product?.category || 'N/A',
            'Created At': ticket.createdAt.toISOString(),
            'Updated At': ticket.updatedAt.toISOString(),
            'First Response Time (Hours)': firstResponseTime || 'N/A',
            'Resolution Time (Hours)': resolutionTime || 'N/A',
            'Message Count': ticket.messages?.length || 0
          });
        });
      });

      csvSheets.push({ name: 'Agent Tickets', data: agentTickets });
      
      metadata = {
        'Report Type': 'Agent Performance Report',
        'Start Date': startDate || 'All Time',
        'End Date': endDate || 'All Time',
        'Generated At': new Date().toISOString(),
        'Total Agents': agentSummary.length,
        'Total Tickets': agentTickets.length
      };
      
      filename = `agent-report-${startDate || 'all'}-${endDate || 'all'}.csv`;

    } else if (type === 'issues') {
      const tickets = await prisma.conversation.findMany({
        where: dateFilter,
        include: {
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
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              category: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Group by issue
      const issueStats = {};
      tickets.forEach(ticket => {
        let issue = ticket.subject || 'No Subject';
        if (!issue || issue === 'No Subject') {
          issue = ticket.messages[0]?.content?.substring(0, 100).trim() || 'No Description';
        }
        const normalizedIssue = issue.toLowerCase().substring(0, 80);

        if (!issueStats[normalizedIssue]) {
          issueStats[normalizedIssue] = {
            'Issue': issue,
            'Total Tickets': 0,
            'Open Tickets': 0,
            'Pending Tickets': 0,
            'Resolved Tickets': 0,
            'Closed Tickets': 0,
            'Average Resolution Time (Hours)': 0,
            'Total Resolution Time': 0,
            'Resolved Count': 0
          };
        }

        issueStats[normalizedIssue]['Total Tickets']++;
        if (ticket.status === 'open') issueStats[normalizedIssue]['Open Tickets']++;
        else if (ticket.status === 'pending') issueStats[normalizedIssue]['Pending Tickets']++;
        else if (ticket.status === 'resolved') issueStats[normalizedIssue]['Resolved Tickets']++;
        else if (ticket.status === 'closed') issueStats[normalizedIssue]['Closed Tickets']++;

        if (ticket.status === 'resolved' || ticket.status === 'closed') {
          const act = ticket.activities[0];
          if (act) {
            const resTime = (act.createdAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
            issueStats[normalizedIssue]['Total Resolution Time'] += resTime;
            issueStats[normalizedIssue]['Resolved Count']++;
          }
        }
      });

      Object.keys(issueStats).forEach(key => {
        const stats = issueStats[key];
        if (stats['Resolved Count'] > 0) {
          stats['Average Resolution Time (Hours)'] = Math.round((stats['Total Resolution Time'] / stats['Resolved Count']) * 100) / 100;
        }
        delete stats['Total Resolution Time'];
        delete stats['Resolved Count'];
      });

      const issueSummary = Object.values(issueStats).sort((a, b) => b['Total Tickets'] - a['Total Tickets']);
      csvSheets.push({ name: 'Issue Summary', data: issueSummary });

      // Detailed tickets by issue
      const detailedIssues = tickets.map(ticket => {
        let issue = ticket.subject || 'No Subject';
        if (!issue || issue === 'No Subject') {
          issue = ticket.messages[0]?.content?.substring(0, 100).trim() || 'No Description';
        }

        let resolutionTime = null;
        if (ticket.status === 'resolved' || ticket.status === 'closed') {
          const act = ticket.activities[0];
          if (act) {
            resolutionTime = Math.round(((act.createdAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60)) * 100) / 100;
          }
        }

        return {
          'Issue': issue,
          'Ticket ID': ticket.ticketNumber || ticket.id,
          'Status': ticket.status,
          'Priority': ticket.priority || 'low',
          'Customer ID': ticket.customerId || 'N/A',
          'Customer Name': ticket.customer?.name || ticket.customerName || 'Unknown',
          'Customer Email': ticket.customer?.email || 'N/A',
          'Product ID': ticket.productId || 'N/A',
          'Product Name': ticket.product?.name || ticket.productModel || 'N/A',
          'Product Category': ticket.product?.category || 'N/A',
          'Assignee ID': ticket.assigneeId || 'N/A',
          'Assignee Name': ticket.assignee?.name || 'Unassigned',
          'Assignee Email': ticket.assignee?.email || 'N/A',
          'Department': ticket.assignee?.department || 'N/A',
          'Created At': ticket.createdAt.toISOString(),
          'Updated At': ticket.updatedAt.toISOString(),
          'Resolution Time (Hours)': resolutionTime || 'N/A',
          'First Message Preview': ticket.messages[0]?.content?.substring(0, 200) || 'N/A'
        };
      });

      csvSheets.push({ name: 'Detailed Issues', data: detailedIssues });
      
      metadata = {
        'Report Type': 'Issue Analytics Report',
        'Start Date': startDate || 'All Time',
        'End Date': endDate || 'All Time',
        'Generated At': new Date().toISOString(),
        'Total Unique Issues': issueSummary.length,
        'Total Tickets': detailedIssues.length
      };
      
      filename = `issue-report-${startDate || 'all'}-${endDate || 'all'}.csv`;

    } else if (type === 'departments') {
      const agents = await prisma.agent.findMany({
        where: {
          isActive: true,
          departmentId: { not: null }
        },
        include: {
          department: {
            select: { id: true, name: true }
          },
          assignedConversations: {
            where: dateFilter,
            include: {
              messages: {
                orderBy: { createdAt: 'asc' }
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
          }
        }
      });

      const deptStats = {};
      agents.forEach(agent => {
        const dept = agent.department?.name || 'Unassigned';
        if (!deptStats[dept]) {
          deptStats[dept] = {
            'Department': dept,
            'Total Agents': 0,
            'Active Agents': 0,
            'Total Tickets': 0,
            'Open Tickets': 0,
            'Pending Tickets': 0,
            'Resolved Tickets': 0,
            'Closed Tickets': 0,
            'Average Resolution Time (Hours)': 0,
            'Average FRT (Hours)': 0,
            'Resolution Rate (%)': 0,
            'Total Resolution Time': 0,
            'Resolved Count': 0,
            'Total FRT': 0,
            'FRT Count': 0
          };
        }

        deptStats[dept]['Total Agents']++;
        if (agent.isActive) deptStats[dept]['Active Agents']++;

        agent.assignedConversations.forEach(ticket => {
          deptStats[dept]['Total Tickets']++;
          if (ticket.status === 'open') deptStats[dept]['Open Tickets']++;
          else if (ticket.status === 'pending') deptStats[dept]['Pending Tickets']++;
          else if (ticket.status === 'resolved') deptStats[dept]['Resolved Tickets']++;
          else if (ticket.status === 'closed') deptStats[dept]['Closed Tickets']++;

          if (ticket.status === 'resolved' || ticket.status === 'closed') {
            const act = ticket.activities[0];
            if (act) {
              const resTime = (act.createdAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
              deptStats[dept]['Total Resolution Time'] += resTime;
              deptStats[dept]['Resolved Count']++;
            }
          }

          if (ticket.messages.length >= 2) {
            const customerMsg = ticket.messages[0];
            const agentMsg = ticket.messages.find(m => m.senderType === 'agent');
            if (customerMsg && agentMsg) {
              const frt = (agentMsg.createdAt.getTime() - customerMsg.createdAt.getTime()) / (1000 * 60 * 60);
              deptStats[dept]['Total FRT'] += frt;
              deptStats[dept]['FRT Count']++;
            }
          }
        });
      });

      Object.keys(deptStats).forEach(key => {
        const stats = deptStats[key];
        if (stats['Resolved Count'] > 0) {
          stats['Average Resolution Time (Hours)'] = Math.round((stats['Total Resolution Time'] / stats['Resolved Count']) * 100) / 100;
        }
        if (stats['FRT Count'] > 0) {
          stats['Average FRT (Hours)'] = Math.round((stats['Total FRT'] / stats['FRT Count']) * 100) / 100;
        }
        if (stats['Total Tickets'] > 0) {
          stats['Resolution Rate (%)'] = Math.round(((stats['Resolved Tickets'] + stats['Closed Tickets']) / stats['Total Tickets']) * 100);
        }
        delete stats['Total Resolution Time'];
        delete stats['Resolved Count'];
        delete stats['Total FRT'];
        delete stats['FRT Count'];
      });

      const deptSummary = Object.values(deptStats).sort((a, b) => b['Total Tickets'] - a['Total Tickets']);
      csvSheets.push({ name: 'Department Summary', data: deptSummary });
      
      metadata = {
        'Report Type': 'Department Analytics Report',
        'Start Date': startDate || 'All Time',
        'End Date': endDate || 'All Time',
        'Generated At': new Date().toISOString(),
        'Total Departments': deptSummary.length,
        'Total Agents': deptSummary.reduce((sum, d) => sum + (d['Total Agents'] || 0), 0),
        'Total Tickets': deptSummary.reduce((sum, d) => sum + (d['Total Tickets'] || 0), 0)
      };
      
      filename = `department-report-${startDate || 'all'}-${endDate || 'all'}.csv`;

    } else if (type === 'csat') {
      // Build date filter for CSAT (uses submittedAt instead of createdAt)
      const csatDateFilter = {};
      if (startDate || endDate) {
        csatDateFilter.submittedAt = {};
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          csatDateFilter.submittedAt.gte = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          csatDateFilter.submittedAt.lte = end;
        }
      }
      
      const feedbacks = await prisma.feedback.findMany({
        where: csatDateFilter,
        include: {
          Conversation: {
            include: {
              assignee: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  department: true
                }
              },
              customer: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { submittedAt: 'desc' }
      });

      // Summary sheet
      const totalFeedbacks = feedbacks.length;
      const ratings = feedbacks.map(f => f.rating);
      const averageRating = totalFeedbacks > 0
        ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / totalFeedbacks) * 100) / 100
        : 0;

      const ratingDistribution = {
        5: ratings.filter(r => r === 5).length,
        4: ratings.filter(r => r === 4).length,
        3: ratings.filter(r => r === 3).length,
        2: ratings.filter(r => r === 2).length,
        1: ratings.filter(r => r === 1).length
      };

      const positiveRatings = ratingDistribution[5] + ratingDistribution[4];
      const csatScore = totalFeedbacks > 0
        ? Math.round((positiveRatings / totalFeedbacks) * 100)
        : 0;

      const summary = [{
        'Total Feedbacks': totalFeedbacks,
        'Average Rating': averageRating,
        'CSAT Score (%)': csatScore,
        '5 Stars': ratingDistribution[5],
        '4 Stars': ratingDistribution[4],
        '3 Stars': ratingDistribution[3],
        '2 Stars': ratingDistribution[2],
        '1 Star': ratingDistribution[1]
      }];

      csvSheets.push({ name: 'CSAT Summary', data: summary });

      // Detailed feedbacks
      const detailedFeedbacks = feedbacks.map(f => ({
        'Feedback ID': f.id,
        'Ticket ID': f.conversationId,
        'Rating': f.rating,
        'Comment': f.comment || 'N/A',
        'Customer Name': f.customerName || f.Conversation?.customer?.name || 'Anonymous',
        'Customer Email': f.Conversation?.customer?.email || 'N/A',
        'Customer Phone': f.Conversation?.customer?.phone || 'N/A',
        'Agent ID': f.Conversation?.assigneeId || 'N/A',
        'Agent Name': f.Conversation?.assignee?.name || 'Unassigned',
        'Agent Email': f.Conversation?.assignee?.email || 'N/A',
        'Department': f.Conversation?.assignee?.department || 'N/A',
        'Subject': f.Conversation?.subject || 'N/A',
        'Product': f.Conversation?.product?.name || f.Conversation?.productModel || 'N/A',
        'Status': f.Conversation?.status || 'N/A',
        'Submitted At': f.submittedAt.toISOString(),
        'Ticket Created At': f.Conversation?.createdAt?.toISOString() || 'N/A'
      }));

      csvSheets.push({ name: 'Detailed Feedbacks', data: detailedFeedbacks });
      
      metadata = {
        'Report Type': 'CSAT (Customer Satisfaction) Report',
        'Start Date': startDate || 'All Time',
        'End Date': endDate || 'All Time',
        'Generated At': new Date().toISOString(),
        'Total Feedbacks': totalFeedbacks,
        'Average Rating': averageRating.toFixed(2),
        'CSAT Score (%)': csatScore
      };
      
      filename = `csat-report-${startDate || 'all'}-${endDate || 'all'}.csv`;

    } else if (type === 'callbacks') {
      // Build date filter for callbacks (uses scheduledTime)
      const callbackDateFilter = {};
      if (startDate || endDate) {
        callbackDateFilter.scheduledTime = {};
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          callbackDateFilter.scheduledTime.gte = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          callbackDateFilter.scheduledTime.lte = end;
        }
      }

      const callbacks = await prisma.scheduledCallback.findMany({
        where: callbackDateFilter,
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              email: true,
              department: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          scheduledTime: 'desc'
        }
      });

      // Summary sheet
      const totalCallbacks = callbacks.length;
      const statusCounts = {
        pending: callbacks.filter(c => c.status === 'pending').length,
        completed: callbacks.filter(c => c.status === 'completed').length,
        cancelled: callbacks.filter(c => c.status === 'cancelled').length,
        denied: callbacks.filter(c => c.status === 'denied').length,
        rescheduled: callbacks.filter(c => c.status === 'rescheduled').length
      };

      const completionRate = totalCallbacks > 0 
        ? Math.round((statusCounts.completed / totalCallbacks) * 100) 
        : 0;
      const cancellationRate = totalCallbacks > 0 
        ? Math.round((statusCounts.cancelled / totalCallbacks) * 100) 
        : 0;

      const summary = [{
        'Total Callbacks': totalCallbacks,
        'Pending': statusCounts.pending,
        'Completed': statusCounts.completed,
        'Cancelled': statusCounts.cancelled,
        'Denied': statusCounts.denied,
        'Rescheduled': statusCounts.rescheduled,
        'Completion Rate (%)': completionRate,
        'Cancellation Rate (%)': cancellationRate
      }];

      csvSheets.push({ name: 'Callback Summary', data: summary });

      // Detailed callbacks
      const detailedCallbacks = callbacks.map(c => ({
        'Callback ID': c.id,
        'Customer Name': c.customerName || 'N/A',
        'Customer Email': c.customerEmail || 'N/A',
        'Phone Number': `${c.countryCode || '+91'} ${c.phoneNumber || 'N/A'}`,
        'Scheduled Time': c.scheduledTime.toISOString(),
        'Rescheduled Time': c.rescheduledTime ? c.rescheduledTime.toISOString() : 'N/A',
        'Status': c.status || 'N/A',
        'Reschedule Status': c.rescheduleStatus || 'N/A',
        'Denial Reason': c.denialReason || 'N/A',
        'Notes': c.notes || 'N/A',
        'Agent ID': c.agentId || 'Unassigned',
        'Agent Name': c.agent?.name || 'Unassigned',
        'Agent Email': c.agent?.email || 'N/A',
        'Department': c.agent?.department?.name || 'N/A',
        'Created At': c.createdAt.toISOString(),
        'Updated At': c.updatedAt.toISOString()
      }));

      csvSheets.push({ name: 'Detailed Callbacks', data: detailedCallbacks });

      metadata = {
        'Report Type': 'Callback Reports',
        'Start Date': startDate || 'All Time',
        'End Date': endDate || 'All Time',
        'Generated At': new Date().toISOString(),
        'Total Callbacks': totalCallbacks,
        'Completion Rate (%)': completionRate,
        'Cancellation Rate (%)': cancellationRate
      };

      filename = `callback-report-${startDate || 'all'}-${endDate || 'all'}.csv`;

    } else {
      return res.status(400).json({ message: 'Invalid export type' });
    }

    // Validate filename is set
    if (!filename) {
      return res.status(500).json({ 
        success: false,
        message: 'Failed to generate filename',
        error: 'Filename not set'
      });
    }

    // Always use CSV format (more reliable)
    try {
      if (!csvSheets || csvSheets.length === 0) {
        return res.status(400).json({ 
          success: false,
          message: 'No data available to export for the selected date range',
          error: 'No data'
        });
      }

      // Combine all sheets into CSV with metadata
      if (!csvContent) {
        csvContent = combineCSVSheets(csvSheets, metadata);
      }

      if (!csvContent || csvContent.trim().length === 0) {
        return res.status(400).json({ 
          success: false,
          message: 'No data available to export for the selected date range',
          error: 'Empty CSV content'
        });
      }

      res.setHeader('Content-Type', 'text/csv;charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));
      return res.status(200).send(csvContent);
    } catch (csvError) {
      console.error('CSV export failed:', csvError);
      console.error('CSV error stack:', csvError.stack);
      return res.status(500).json({ 
        success: false,
        message: 'Failed to export report as CSV',
        error: csvError.message,
        stack: process.env.NODE_ENV === 'development' ? csvError.stack : undefined
      });
    }

  } catch (error) {
    console.error('Error exporting report:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      success: false,
      message: 'Error exporting report',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

