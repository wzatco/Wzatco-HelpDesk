const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true,
        agent: {
          include: {
            department: true
          }
        }
      }
    });

    console.log(`\nTotal users in database: ${users.length}\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Type: ${user.type}`);
      console.log(`   Role: ${user.role?.title || 'No role'}`);
      console.log(`   Linked Agent: ${user.agent ? `Yes (${user.agent.slug})` : 'No'}`);
      if (user.agent?.department) {
        console.log(`   Department: ${user.agent.department.name}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();

