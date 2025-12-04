/**
 * Generate a URL-friendly slug from a string
 * @param {string} text - The text to convert to a slug
 * @returns {string} - The generated slug
 */
export function generateSlug(text) {
  if (!text) return '';
  
  return text
    .toString()
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    // Remove all non-word characters except hyphens
    .replace(/[^\w\-]+/g, '')
    // Replace multiple hyphens with a single hyphen
    .replace(/\-\-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Generate a unique slug by appending a number if the slug already exists
 * @param {string} baseSlug - The base slug
 * @param {Function} checkExists - Async function that checks if slug exists (returns boolean)
 * @returns {Promise<string>} - The unique slug
 */
export async function generateUniqueSlug(baseSlug, checkExists) {
  let slug = baseSlug;
  let counter = 1;
  
  while (await checkExists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

