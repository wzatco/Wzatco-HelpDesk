// Quick script to verify agent slugs in database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifySlugs() {
  try {
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        email: true
      },
      orderBy: { name: 'asc' }
    });

    console.log('\n📋 Current Agent Slugs in Database:\n');
    agents.forEach(agent => {
      console.log(`  ${agent.name.padEnd(20)} → ${agent.slug}`);
      console.log(`    Email: ${agent.email || 'N/A'}`);
      console.log(`    DB ID: ${agent.id}`);
      console.log('');
    });

    console.log(`Total: ${agents.length} agents\n`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySlugs();

