const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    // Check agents
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        accountId: true
      }
    });
    
    console.log('\n=== AGENTS ===');
    console.log('Total:', agents.length);
    agents.forEach(a => {
      console.log(`  ${a.name} - ${a.email} - accountId: ${a.accountId || 'NULL'}`);
    });
    
    // Check users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        status: true
      }
    });
    
    console.log('\n=== USERS ===');
    console.log('Total:', users.length);
    users.forEach(u => {
      console.log(`  ${u.name} - ${u.email} - status: ${u.status}`);
    });
    
    if (users.length === 0 && agents.length > 0) {
      console.log('\n⚠️  No users found but agents exist! Creating users...\n');
      
      for (const agent of agents) {
        if (agent.email) {
          try {
            const user = await prisma.user.create({
              data: {
                name: agent.name,
                email: agent.email,
                status: 'active',
                type: 'agent'
              }
            });
            
            await prisma.agent.update({
              where: { id: agent.id },
              data: { accountId: user.id }
            });
            
            console.log(`✓ Created user for ${agent.name}`);
          } catch (e) {
            console.log(`✗ Error for ${agent.name}: ${e.message}`);
          }
        }
      }
      
      console.log('\n✅ Done! Users created.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();

