/**
 * Generate formatted Ticket ID based on various factors
 * Format: TKT-{YYMM}-{SEQ}
 * Example: TKT-2411-001
 * 
 * Components:
 * - TKT: Ticket prefix
 * - YYMM: Year and month (e.g., 2411 for November 2024)
 * - SEQ: Sequential number (001, 002, etc.)
 * 
 * Note: Category, Priority, and Department are NOT included in the ID to avoid confusion
 * when these values are changed after ticket creation. The ID remains clean and unique.
 */

// Category/Issue Type codes (same as customer IDs)
const CATEGORY_CODES = {
  'WZATCO': 'WZ',
  'Technical': 'TEC',
  'Billing': 'BIL',
  'Support': 'SUP',
  'Service': 'SVC',
  'Delivery': 'DEL',
  'Other': 'OTH',
  'default': 'GEN'
};

// Priority codes
const PRIORITY_CODES = {
  'low': 'LOW',
  'medium': 'MED',
  'high': 'HIG',
  'default': 'LOW'
};

// Category code
export function getCategoryCode(category) {
  if (!category) return CATEGORY_CODES.default;
  const upperCategory = category.toUpperCase();
  return CATEGORY_CODES[upperCategory] || CATEGORY_CODES.default;
}

// Priority code
export function getPriorityCode(priority) {
  if (!priority) return PRIORITY_CODES.default;
  const lowerPriority = priority.toLowerCase();
  return PRIORITY_CODES[lowerPriority] || PRIORITY_CODES.default;
}

/**
 * Generate Ticket ID
 * Format: TKT-{YYMM}-{SEQ}
 * Example: TKT-2411-001
 * 
 * @param {Object} options
 * @param {string} options.category - Issue category (deprecated, kept for backward compatibility but not used)
 * @param {string} options.priority - Ticket priority (deprecated, kept for backward compatibility but not used)
 * @param {Date} options.createdAt - Creation date (defaults to now)
 * @param {number} options.sequence - Sequence number for the month (optional, will be fetched if not provided and prisma is provided)
 * @param {PrismaClient} options.prisma - Prisma client instance (optional, needed if sequence is not provided)
 * @returns {Promise<string>} Formatted Ticket ID
 */
export async function generateTicketId({ category, priority, createdAt = new Date(), sequence = null, prisma = null }) {
  // If sequence is not provided, get it from database
  if (sequence === null && prisma) {
    sequence = await getNextTicketSequence(prisma, createdAt);
  } else if (sequence === null) {
    sequence = 1;
  }
  
  // Get year and month (YYMM format)
  const year = createdAt.getFullYear().toString().slice(-2);
  const month = String(createdAt.getMonth() + 1).padStart(2, '0');
  const yymm = `${year}${month}`;
  
  // Format sequence (3 digits)
  const seq = String(sequence).padStart(3, '0');
  
  // Generate ID: TKT-{YYMM}-{SEQ} (clean and simple, no category or priority)
  return `TKT-${yymm}-${seq}`;
}

/**
 * Get the next sequence number for a given month
 * @param {PrismaClient} prisma - Prisma client instance
 * @param {Date} date - Date to check (defaults to now)
 * @returns {Promise<number>} Next sequence number
 */
export async function getNextTicketSequence(prisma, date = new Date()) {
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const yymm = `${year}${month}`;
  
  // Find all tickets (conversations) with matching pattern (new format: TKT-YYMM-SEQ)
  const tickets = await prisma.conversation.findMany({
    where: {
      id: {
        startsWith: `TKT-${yymm}-`
      }
    },
    orderBy: {
      id: 'desc'
    }
  });
  
  if (tickets.length === 0) {
    return 1;
  }
  
  // Extract sequence from last ticket ID
  // Handle old formats (TKT-YYMM-CAT-PRI-SEQ, TKT-YYMM-CAT-SEQ) and new format (TKT-YYMM-SEQ)
  let maxSeq = 0;
  tickets.forEach(ticket => {
    const parts = ticket.id.split('-');
    const lastPart = parts[parts.length - 1];
    const seq = parseInt(lastPart || '0', 10);
    if (seq > maxSeq) {
      maxSeq = seq;
    }
  });
  
  return maxSeq + 1;
}

