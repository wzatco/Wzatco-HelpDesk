/**
 * Generate formatted Customer ID based on various factors
 * Format: CUST-{YYMM}-{CATEGORY}-{PRODUCT}-{SEQ}
 * Example: CUST-2411-WZ-PRO-001
 * 
 * Components:
 * - CUST: Customer prefix
 * - YYMM: Year and month (e.g., 2411 for November 2024)
 * - CATEGORY: Issue category code (WZ, TEC, BIL, etc.)
 * - PRODUCT: Product model code (first 3 letters, uppercase)
 * - SEQ: Sequential number (001, 002, etc.)
 */

// Category/Issue Type codes
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

// Product Model codes (first 3 letters, uppercase)
export function getProductCode(productModel) {
  if (!productModel) return 'GEN';
  const cleaned = productModel.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return cleaned.substring(0, 3) || 'GEN';
}

// Category code
export function getCategoryCode(category) {
  if (!category) return CATEGORY_CODES.default;
  const upperCategory = category.toUpperCase();
  return CATEGORY_CODES[upperCategory] || CATEGORY_CODES.default;
}

/**
 * Generate Customer ID
 * Format: CUST-{YYMM}-{CATEGORY}-{PRODUCT}-{SEQ}
 * Example: CUST-2411-WZ-PRO-001
 * 
 * @param {Object} options
 * @param {string} options.category - Issue category
 * @param {string} options.productModel - Product model
 * @param {Date} options.createdAt - Creation date (defaults to now)
 * @param {number} options.sequence - Sequence number for the month (optional, will be fetched if not provided and prisma is provided)
 * @param {PrismaClient} options.prisma - Prisma client instance (optional, needed if sequence is not provided)
 * @returns {Promise<string>} Formatted Customer ID
 */
export async function generateCustomerId({ category, productModel, createdAt = new Date(), sequence = null, prisma = null }) {
  // If sequence is not provided, get it from database
  if (sequence === null && prisma) {
    sequence = await getNextCustomerSequence(prisma, category, productModel, createdAt);
  } else if (sequence === null) {
    sequence = 1;
  }
  
  // Get year and month (YYMM format)
  const year = createdAt.getFullYear().toString().slice(-2);
  const month = String(createdAt.getMonth() + 1).padStart(2, '0');
  const yymm = `${year}${month}`;
  
  // Get category and product codes
  const catCode = getCategoryCode(category);
  const prodCode = getProductCode(productModel);
  
  // Format sequence (3 digits)
  const seq = String(sequence).padStart(3, '0');
  
  // Generate ID: CUST-{YYMM}-{CATEGORY}-{PRODUCT}-{SEQ}
  return `CUST-${yymm}-${catCode}-${prodCode}-${seq}`;
}

/**
 * Get the next sequence number for a given month and category/product combination
 * @param {PrismaClient} prisma - Prisma client instance
 * @param {string} category - Issue category
 * @param {string} productModel - Product model
 * @param {Date} date - Date to check (defaults to now)
 * @returns {Promise<number>} Next sequence number
 */
export async function getNextCustomerSequence(prisma, category, productModel, date = new Date()) {
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const yymm = `${year}${month}`;
  const catCode = getCategoryCode(category);
  const prodCode = getProductCode(productModel);
  
  // Find all customers with matching pattern
  const customers = await prisma.customer.findMany({
    where: {
      id: {
        startsWith: `CUST-${yymm}-${catCode}-${prodCode}-`
      }
    },
    orderBy: {
      id: 'desc'
    },
    take: 1
  });
  
  if (customers.length === 0) {
    return 1;
  }
  
  // Extract sequence from last customer ID
  const lastId = customers[0].id;
  const lastSeq = parseInt(lastId.split('-').pop() || '0', 10);
  return lastSeq + 1;
}
