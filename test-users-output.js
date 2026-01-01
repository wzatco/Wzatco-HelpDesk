const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function test() {
  const output = [];
  
  try {
    output.push('Checking users...\n');
    
    const users = await prisma.user.count();
    output.push(`Total users: ${users}\n`);
    
    const agents = await prisma.agent.count();
    output.push(`Total agents: ${agents}\n`);
    
    const usersList = await prisma.user.findMany({
      select: {
        name: true,
        email: true,
        status: true,
        accountId: true
      }
    });
    
    output.push('\nUsers:\n');
    usersList.forEach(u => {
      output.push(`  - ${u.name} (${u.email}) - ${u.status}\n`);
    });
    
  } catch (error) {
    output.push(`Error: ${error.message}\n`);
    output.push(`Stack: ${error.stack}\n`);
  }
  
  const result = output.join('');
  console.log(result);
  fs.writeFileSync('test-output.txt', result);
  
  await prisma.$disconnect();
}

test();

