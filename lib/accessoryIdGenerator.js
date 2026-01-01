import prisma from './prisma';

/**
 * Generate formatted Accessory ID based on accessory name and product
 * Format: ACC-{PRODUCT_CODE}-{NAME_SLUG}-{SEQ}
 * Example: ACC-IPHO-iphone-case-001
 * 
 * Components:
 * - ACC: Accessory prefix
 * - PRODUCT_CODE: Product code (first 3-4 letters from product name, uppercase)
 * - NAME_SLUG: Accessory name converted to slug
 * - SEQ: Sequential number (001, 002, etc.) if needed for uniqueness
 */

/**
 * Generate a URL-friendly slug from a string
 */
function generateSlug(text) {
  if (!text) return '';
  
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Get product code (first 3 letters, uppercase)
 */
function getProductCode(productName) {
  if (!productName) return 'GEN';
  const cleaned = productName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return cleaned.substring(0, 3) || 'GEN';
}

/**
 * Get smart abbreviation from accessory name
 */
function getSmartAbbrev(name, maxLength = 4) {
  if (!name) return '';
  
  // Remove special characters and convert to lowercase
  const cleaned = name.replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase().trim();
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 0) return '';
  
  // For single word, take first maxLength chars
  if (words.length === 1) {
    return words[0].substring(0, maxLength);
  }
  
  // For multiple words, use first word if short, else first letters
  if (words[0].length <= maxLength) {
    return words[0];
  }
  
  // Build from first letters
  let abbrev = '';
  for (let i = 0; i < words.length && abbrev.length < maxLength; i++) {
    abbrev += words[i][0];
  }
  
  // Fill with more from first word if needed
  if (abbrev.length < maxLength) {
    abbrev += words[0].substring(1, maxLength - abbrev.length + 1);
  }
  
  return abbrev.substring(0, maxLength);
}

/**
 * Generate Accessory ID
 * Format: ACC-{PRODUCT_CODE}-{NAME_SLUG}
 * Example: ACC-IPHO-iphone-case
 * 
 * @param {Object} options
 * @param {string} options.name - Accessory name
 * @param {string} options.productName - Product name (for product code)
 * @param {PrismaClient} options.prisma - Prisma client instance (optional, for checking uniqueness)
 * @returns {Promise<string>} Formatted Accessory ID
 */
export async function generateAccessoryId({ name, productName, prisma = null }) {
  if (!name) {
    throw new Error('Accessory name is required');
  }

  // Get product code
  const prodCode = getProductCode(productName);
  
  // Get smart abbreviation from accessory name
  const nameAbbrev = getSmartAbbrev(name, 4);
  
  // Base ID: ACC-{PRODUCT_CODE}-{NAME_ABBREV}
  let accessoryId = `ACC-${prodCode}-${nameAbbrev}`;
  
  // If prisma is provided, check for uniqueness and add sequence if needed
  if (prisma) {
    let counter = 1;
    let isUnique = false;
    
    while (!isUnique && counter < 1000) {
      const existing = await prisma.accessory.findUnique({
        where: { id: accessoryId }
      });
      
      if (!existing) {
        isUnique = true;
      } else {
        // Add sequence number
        const seq = String(counter).padStart(2, '0');
        accessoryId = `ACC-${prodCode}-${nameAbbrev}${seq}`;
        counter++;
      }
    }
  }
  
  return accessoryId;
}

/**
 * Generate a simple Accessory ID without database check
 * Format: ACC-{PRODUCT_CODE}-{NAME_SLUG}
 * 
 * @param {string} name - Accessory name
 * @param {string} productName - Product name
 * @returns {string} Formatted Accessory ID
 */
export function generateAccessoryIdSimple(name, productName) {
  if (!name) {
    throw new Error('Accessory name is required');
  }

  const prodCode = getProductCode(productName);
  const nameAbbrev = getSmartAbbrev(name, 4);
  
  return `ACC-${prodCode}-${nameAbbrev}`;
}

