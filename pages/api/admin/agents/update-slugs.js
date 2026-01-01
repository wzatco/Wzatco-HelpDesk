// API endpoint to update all agent slugs based on their names
import prisma from '@/lib/prisma';
import { generateSlug, generateUniqueSlug } from '../../../../lib/utils/slug';
import { getCurrentUserId } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get all agents
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        slug: true
      },
      orderBy: { name: 'asc' }
    });

    console.log(`Found ${agents.length} agents to update`);

    const results = [];
    const existingSlugs = new Set();

    // First pass: collect all existing slugs
    for (const agent of agents) {
      if (agent.slug) {
        existingSlugs.add(agent.slug);
      }
    }

    // Second pass: update slugs based on names
    for (const agent of agents) {
      try {
        // Generate slug from name
        let baseSlug = generateSlug(agent.name);
        
        // If name doesn't generate a good slug, try email
        if (!baseSlug || baseSlug.length < 2) {
          if (agent.email) {
            // Extract name from email (e.g., arshiyawzatco@outlook.com -> arshiya)
            const emailName = agent.email.split('@')[0];
            // Remove common suffixes like 'wzatco'
            const cleanEmailName = emailName.replace(/wzatco|wzat|co/gi, '').trim();
            if (cleanEmailName.length >= 2) {
              baseSlug = generateSlug(cleanEmailName);
            }
          }
        }

        if (!baseSlug || baseSlug.length < 2) {
          console.warn(`Skipping agent ${agent.id} - cannot generate slug from name: "${agent.name}" or email: "${agent.email}"`);
          results.push({
            id: agent.id,
            name: agent.name,
            email: agent.email,
            oldSlug: agent.slug,
            newSlug: null,
            status: 'skipped',
            reason: 'Cannot generate valid slug'
          });
          continue;
        }

        // Generate unique slug
        let uniqueSlug = baseSlug;
        let counter = 1;
        while (existingSlugs.has(uniqueSlug)) {
          uniqueSlug = `${baseSlug}-${counter}`;
          counter++;
        }

        // Update the agent
        await prisma.agent.update({
          where: { id: agent.id },
          data: { slug: uniqueSlug }
        });

        // Remove old slug and add new one to the set
        if (agent.slug && agent.slug !== uniqueSlug) {
          existingSlugs.delete(agent.slug);
        }
        existingSlugs.add(uniqueSlug);

        results.push({
          id: agent.id,
          name: agent.name,
          email: agent.email,
          oldSlug: agent.slug,
          newSlug: uniqueSlug,
          status: 'updated'
        });

        console.log(`✓ Updated agent "${agent.name}" (${agent.email}): ${agent.slug} -> ${uniqueSlug}`);
      } catch (error) {
        console.error(`✗ Error updating agent ${agent.id}:`, error.message);
        results.push({
          id: agent.id,
          name: agent.name,
          email: agent.email,
          oldSlug: agent.slug,
          newSlug: null,
          status: 'error',
          error: error.message
        });
      }
    }

    const updated = results.filter(r => r.status === 'updated').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;

    return res.status(200).json({
      success: true,
      message: `Updated ${updated} agent slugs`,
      summary: {
        total: agents.length,
        updated,
        skipped,
        errors
      },
      results
    });
  } catch (error) {
    console.error('Error updating agent slugs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update agent slugs',
      error: error.message
    });
  }
}

