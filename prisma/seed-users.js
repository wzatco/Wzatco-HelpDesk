const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding users for agents...\n');

  try {
    // Get all agents
    const agents = await prisma.agent.findMany({
      include: {
        department: true,
        role: true
      }
    });

    console.log(`Found ${agents.length} agents in database\n`);

    if (agents.length === 0) {
      console.log('⚠️  No agents found. Please create agents first.');
      return;
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const agent of agents) {
      console.log(`Processing: ${agent.name}`);

      if (!agent.email) {
        console.log(`  ⊘ Skipped - No email address\n`);
        skipped++;
        continue;
      }

      const email = agent.email.toLowerCase().trim();

      // Check if user already exists
      let user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        // Create user
        user = await prisma.user.create({
          data: {
            name: agent.name,
            email: email,
            status: agent.isActive ? 'active' : 'inactive',
            type: 'agent',
            roleId: agent.roleId || null
          }
        });
        console.log(`  ✓ Created user account`);
        created++;
      } else {
        console.log(`  ℹ️  User already exists`);
      }

      // Link agent to user if not already linked
      if (agent.accountId !== user.id) {
        await prisma.agent.update({
          where: { id: agent.id },
          data: { accountId: user.id }
        });
        console.log(`  ✓ Linked agent to user account`);
        updated++;
      }

      console.log('');
    }

    console.log('═'.repeat(50));
    console.log('✅ Seeding complete!');
    console.log('═'.repeat(50));
    console.log(`  Created:  ${created} users`);
    console.log(`  Updated:  ${updated} agent links`);
    console.log(`  Skipped:  ${skipped} agents`);
    console.log(`  Total:    ${agents.length} agents processed`);
    console.log('═'.repeat(50));

  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

