/**
 * Script to backfill slugs for existing agents
 * Run this after adding the slug field to the database
 * Usage: node scripts/backfill-agent-slugs.js
 */

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

async function generateUniqueSlug(baseSlug, existingSlugs) {
  let slug = baseSlug;
  let counter = 1;
  
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

async function backfillSlugs() {
  try {
    console.log('Starting slug backfill for agents...');
    
    // Get all agents without slugs or with empty slugs
    const agents = await prisma.agent.findMany({
      where: {
        OR: [
          { slug: null },
          { slug: '' }
        ]
      }
    });

    console.log(`Found ${agents.length} agents without slugs`);

    // Get all existing slugs to avoid duplicates
    const allAgents = await prisma.agent.findMany({
      select: { slug: true }
    });
    const existingSlugs = new Set(
      allAgents
        .map(a => a.slug)
        .filter(slug => slug && slug.trim() !== '')
    );

    let updated = 0;
    let errors = 0;

    for (const agent of agents) {
      try {
        const baseSlug = generateSlug(agent.name);
        if (!baseSlug) {
          console.warn(`Skipping agent ${agent.id} - cannot generate slug from name: "${agent.name}"`);
          errors++;
          continue;
        }

        const uniqueSlug = await generateUniqueSlug(baseSlug, existingSlugs);
        existingSlugs.add(uniqueSlug);

        await prisma.agent.update({
          where: { id: agent.id },
          data: { slug: uniqueSlug }
        });

        console.log(`✓ Updated agent "${agent.name}" with slug: ${uniqueSlug}`);
        updated++;
      } catch (error) {
        console.error(`✗ Error updating agent ${agent.id}:`, error.message);
        errors++;
      }
    }

    console.log(`\nBackfill complete!`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Errors: ${errors}`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

backfillSlugs();

