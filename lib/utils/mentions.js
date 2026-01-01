import prisma from '../prisma';

/**
 * Utility functions for parsing and handling @mentions
 */

/**
 * Parse @mentions from text
 * Returns array of mention objects: { type: 'agent'|'admin', name: string, fullMatch: string }
 * @param {string} text - Text to parse
 * @returns {Array} Array of mention objects
 */
export function parseMentions(text) {
  if (!text || typeof text !== 'string') return [];
  
  // Match @username or @email patterns
  // Supports: @username, @user.name, @user_name, @email@domain.com
  const mentionRegex = /@([a-zA-Z0-9._-]+(?:@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})?)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    const fullMatch = match[0]; // @username
    const mentionText = match[1]; // username
    
    mentions.push({
      fullMatch,
      mentionText,
      index: match.index
    });
  }
  
  // Remove duplicates
  const uniqueMentions = [];
  const seen = new Set();
  for (const mention of mentions) {
    const key = mention.mentionText.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueMentions.push(mention);
    }
  }
  
  return uniqueMentions;
}

/**
 * Find user (agent or admin) by mention text (name or email)
 * @param {PrismaClient} prisma - Prisma client
 * @param {string} mentionText - The text after @ (could be name or email)
 * @returns {Promise<Object|null>} User object with { id, name, email, type: 'agent'|'admin' } or null
 */
export async function findUserByMention(prisma, mentionText) {
  if (!mentionText) return null;
  
  const searchText = mentionText.toLowerCase().trim();
  
  try {
    // Check if it's an email
    const isEmail = searchText.includes('@');
    
    if (isEmail) {
      // Search by email in agents first
      const agent = await prisma.agent.findFirst({
        where: {
          email: { equals: searchText, mode: 'insensitive' }
        },
        select: { id: true, name: true, email: true }
      });
      
      if (agent) {
        return { ...agent, type: 'agent' };
      }
      
      // Search by email in admins
      const admin = await prisma.admin.findFirst({
        where: {
          email: { equals: searchText, mode: 'insensitive' }
        },
        select: { id: true, name: true, email: true }
      });
      
      if (admin) {
        return { ...admin, type: 'admin' };
      }
    } else {
      // Search by name (partial match)
      // Try agents first
      const agents = await prisma.agent.findMany({
        where: {
          OR: [
            { name: { contains: searchText, mode: 'insensitive' } },
            { slug: { contains: searchText, mode: 'insensitive' } }
          ]
        },
        select: { id: true, name: true, email: true },
        take: 1
      });
      
      if (agents.length > 0) {
        return { ...agents[0], type: 'agent' };
      }
      
      // Try admins
      const admins = await prisma.admin.findMany({
        where: {
          name: { contains: searchText, mode: 'insensitive' }
        },
        select: { id: true, name: true, email: true },
        take: 1
      });
      
      if (admins.length > 0) {
        return { ...admins[0], type: 'admin' };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding user by mention:', error);
    return null;
  }
}

/**
 * Render text with @mentions highlighted
 * @param {string} text - Text to render
 * @returns {string} HTML string with highlighted mentions
 */
export function renderMentions(text) {
  if (!text || typeof text !== 'string') return text;
  
  const mentions = parseMentions(text);
  let rendered = text;
  
  // Replace mentions with highlighted versions (in reverse order to preserve indices)
  for (let i = mentions.length - 1; i >= 0; i--) {
    const mention = mentions[i];
    const highlighted = `<span class="mention-highlight bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded font-semibold">${mention.fullMatch}</span>`;
    rendered = rendered.substring(0, mention.index) + highlighted + rendered.substring(mention.index + mention.fullMatch.length);
  }
  
  return rendered;
}

