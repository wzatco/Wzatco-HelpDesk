/**
 * Script to create User records for existing Agents
 * This ensures each agent has a corresponding user account
 * Usage: node scripts/create-users-for-agents.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createUsersForAgents() {
  try {
    console.log('Starting user creation for existing agents...\n');

    // Get all agents
    const agents = await prisma.agent.findMany({
      include: {
        department: true,
        role: true
      }
    });

    console.log(`Found ${agents.length} agents`);

    if (agents.length === 0) {
      console.log('No agents found. Exiting.');
      return;
    }

    // Get all existing users to avoid duplicates
    const existingUsers = await prisma.user.findMany({
      select: { email: true, id: true }
    });
    const existingEmails = new Set(existingUsers.map(u => u.email?.toLowerCase()));
    const existingUserIds = new Set(existingUsers.map(u => u.id));

    let created = 0;
    let linked = 0;
    let skipped = 0;
    let errors = 0;

    for (const agent of agents) {
      try {
        console.log(`\nProcessing agent: ${agent.name} (${agent.email})`);

        if (!agent.email) {
          console.log(`  ⚠️  Skipping - no email address`);
          skipped++;
          continue;
        }

        const normalizedEmail = agent.email.toLowerCase();

        // Check if user already exists
        let user = existingUsers.find(u => u.email?.toLowerCase() === normalizedEmail);

        if (!user) {
          // Create new user
          user = await prisma.user.create({
            data: {
              name: agent.name,
              email: normalizedEmail,
              status: agent.isActive ? 'active' : 'inactive',
              type: 'agent',
              roleId: agent.roleId || null
            }
          });
          console.log(`  ✓ Created user account: ${user.email}`);
          created++;
          existingUsers.push(user);
        } else {
          console.log(`  ℹ️  User already exists: ${user.email}`);
        }

        // Check if agent needs to be linked to user
        if (!agent.accountId || agent.accountId !== user.id) {
          // Update agent to link to user
          await prisma.agent.update({
            where: { id: agent.id },
            data: { accountId: user.id }
          });
          console.log(`  ✓ Linked agent to user account`);
          linked++;
        } else {
          console.log(`  ℹ️  Agent already linked to user`);
        }

      } catch (error) {
        console.error(`  ✗ Error processing agent ${agent.name}:`, error.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('User creation completed!');
    console.log('='.repeat(60));
    console.log(`  Users created:     ${created}`);
    console.log(`  Agents linked:     ${linked}`);
    console.log(`  Skipped:           ${skipped}`);
    console.log(`  Errors:            ${errors}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createUsersForAgents();

