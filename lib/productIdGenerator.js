/**
 * Generate formatted Product ID based on product name and category
 * Format: PROD-{CATEGORY}-{NAME_SLUG}-{SEQ}
 * Example: PROD-TECH-iphone-15-pro-001
 * 
 * Components:
 * - PROD: Product prefix
 * - CATEGORY: Category code (first 3-4 letters, uppercase)
 * - NAME_SLUG: Product name converted to slug
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
 * Get category code (first 3 letters, uppercase)
 */
function getCategoryCode(category) {
  if (!category) return 'GEN';
  const cleaned = category.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return cleaned.substring(0, 3) || 'GEN';
}

/**
 * Get smart abbreviation from product name
 */
function getSmartAbbrev(name, maxLength = 5) {
  if (!name) return '';
  
  // Remove special characters and convert to lowercase
  const cleaned = name.replace(/[^a-zA-Z0-9\s]/g, '').toLowerCase().trim();
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 0) return '';
  
  // For single word, take first maxLength chars
  if (words.length === 1) {
    return words[0].substring(0, maxLength);
  }
  
  // For multiple words, prioritize last word (usually the model/variant)
  // If last word is short, use it; otherwise use first letters of key words
  const lastWord = words[words.length - 1];
  if (lastWord.length <= maxLength) {
    return lastWord;
  }
  
  // Build from first letters of important words
  let abbrev = '';
  for (let i = 0; i < words.length && abbrev.length < maxLength; i++) {
    abbrev += words[i][0];
  }
  
  // Fill remaining with letters from last word
  if (abbrev.length < maxLength) {
    abbrev += lastWord.substring(0, maxLength - abbrev.length);
  }
  
  return abbrev.substring(0, maxLength);
}

/**
 * Generate Product ID
 * Format: PROD-{CATEGORY}-{NAME_SLUG}
 * Example: PROD-TECH-iphone-15-pro
 * 
 * @param {Object} options
 * @param {string} options.name - Product name
 * @param {string} options.category - Product category
 * @param {PrismaClient} options.prisma - Prisma client instance (optional, for checking uniqueness)
 * @returns {Promise<string>} Formatted Product ID
 */
export async function generateProductId({ name, category, prisma = null }) {
  if (!name) {
    throw new Error('Product name is required');
  }

  // Get category code
  const catCode = getCategoryCode(category);
  
  // Get smart abbreviation from product name
  const nameAbbrev = getSmartAbbrev(name, 5);
  
  // Base ID: PROD-{CATEGORY}-{NAME_ABBREV}
  let productId = `PROD-${catCode}-${nameAbbrev}`;
  
  // If prisma is provided, check for uniqueness and add sequence if needed
  if (prisma) {
    let counter = 1;
    let isUnique = false;
    
    while (!isUnique && counter < 1000) {
      const existing = await prisma.product.findUnique({
        where: { id: productId }
      });
      
      if (!existing) {
        isUnique = true;
      } else {
        // Add sequence number
        const seq = String(counter).padStart(2, '0');
        productId = `PROD-${catCode}-${nameAbbrev}${seq}`;
        counter++;
      }
    }
  }
  
  return productId;
}

/**
 * Generate a simple Product ID without database check
 * Format: PROD-{CATEGORY}-{NAME_SLUG}
 * 
 * @param {string} name - Product name
 * @param {string} category - Product category
 * @returns {string} Formatted Product ID
 */
export function generateProductIdSimple(name, category) {
  if (!name) {
    throw new Error('Product name is required');
  }

  const catCode = getCategoryCode(category);
  const nameAbbrev = getSmartAbbrev(name, 5);
  
  return `PROD-${catCode}-${nameAbbrev}`;
}

