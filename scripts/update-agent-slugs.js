// Script to update all agent slugs based on their names/emails
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

async function updateAgentSlugs() {
  try {
    console.log('Starting agent slug update...\n');
    
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

    console.log(`Found ${agents.length} agents to update\n`);

    const results = [];
    const usedSlugs = new Set(); // Track slugs we've assigned in this run

    // Update slugs based on names
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
            } else {
              // If cleaning removes too much, use the original email name
              baseSlug = generateSlug(emailName);
            }
          }
        }

        if (!baseSlug || baseSlug.length < 2) {
          console.warn(`⚠ Skipping agent ${agent.id} - cannot generate slug from name: "${agent.name}" or email: "${agent.email}"`);
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

        // Generate unique slug - check both database and our usedSlugs set
        let uniqueSlug = baseSlug;
        let counter = 1;
        
        while (true) {
          // Check if slug is already used in this batch
          if (usedSlugs.has(uniqueSlug)) {
            uniqueSlug = `${baseSlug}-${counter}`;
            counter++;
            continue;
          }
          
          // Check if slug exists in database (excluding current agent)
          const existing = await prisma.agent.findFirst({
            where: {
              slug: uniqueSlug,
              id: { not: agent.id }
            }
          });
          
          if (!existing) {
            break; // Slug is unique
          }
          
          uniqueSlug = `${baseSlug}-${counter}`;
          counter++;
        }

        // Mark this slug as used
        usedSlugs.add(uniqueSlug);

        // Update the agent
        await prisma.agent.update({
          where: { id: agent.id },
          data: { slug: uniqueSlug }
        });

        const changed = agent.slug !== uniqueSlug;
        console.log(`${changed ? '✓' : '='} ${agent.name} (${agent.email || 'no email'})`);
        if (changed) {
          console.log(`  ${agent.slug || '(no slug)'} → ${uniqueSlug}`);
        } else {
          console.log(`  Slug already correct: ${uniqueSlug}`);
        }

        results.push({
          id: agent.id,
          name: agent.name,
          email: agent.email,
          oldSlug: agent.slug,
          newSlug: uniqueSlug,
          status: 'updated',
          changed
        });
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

    const updated = results.filter(r => r.status === 'updated' && r.changed).length;
    const unchanged = results.filter(r => r.status === 'updated' && !r.changed).length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;

    console.log(`\n${'='.repeat(60)}`);
    console.log('Update Summary:');
    console.log(`  Total agents: ${agents.length}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Unchanged: ${unchanged}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors: ${errors}`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateAgentSlugs();

