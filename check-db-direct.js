const { PrismaClient } = require('@prisma/client');

async function checkDB() {
  const prisma = new PrismaClient({
    log: ['error'],
  });

  try {
    console.log('🔍 Checking Database State...\n');

    // Check each table
    const tables = {
      'Agents': () => prisma.agent.count(),
      'Users': () => prisma.user.count(),
      'Customers': () => prisma.customer.count(),
      'Conversations (Tickets)': () => prisma.conversation.count(),
      'Departments': () => prisma.department.count(),
      'Roles': () => prisma.role.count(),
      'SLA Policies': () => prisma.sLAPolicy.count(),
      'SLA Workflows': () => prisma.sLAWorkflow.count(),
      'SLA Timers': () => prisma.sLATimer.count(),
      'Products': () => prisma.product.count(),
      'Knowledge Base': () => prisma.knowledgeBase.count(),
    };

    const results = {};
    let totalRecords = 0;

    for (const [tableName, countFn] of Object.entries(tables)) {
      try {
        const count = await countFn();
        results[tableName] = count;
        totalRecords += count;
        console.log(`✅ ${tableName.padEnd(25)}: ${count} records`);
      } catch (error) {
        if (error.message.includes('does not exist') || error.message.includes('no such table')) {
          console.log(`❌ ${tableName.padEnd(25)}: Table does not exist`);
          results[tableName] = 0;
        } else {
          console.log(`⚠️  ${tableName.padEnd(25)}: Error - ${error.message}`);
          results[tableName] = -1;
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📊 Total Records: ${totalRecords}`);
    console.log('='.repeat(50));

    if (totalRecords === 0) {
      console.log('\n⚠️  Database is EMPTY!');
      console.log('\n💡 To populate data:');
      console.log('   1. Start dev server: npm run dev');
      console.log('   2. Create data through the UI');
      console.log('   3. Or run seed scripts if available');
    } else {
      console.log('\n✅ Database has data!');
      
      // Show some sample data
      console.log('\n📋 Sample Data:');
      try {
        const agents = await prisma.agent.findMany({ take: 3, select: { name: true, email: true } });
        if (agents.length > 0) {
          console.log('\n  Agents:');
          agents.forEach(a => console.log(`    - ${a.name} (${a.email || 'no email'})`));
        }
      } catch (e) {}

      try {
        const customers = await prisma.customer.findMany({ take: 3, select: { name: true, email: true } });
        if (customers.length > 0) {
          console.log('\n  Customers:');
          customers.forEach(c => console.log(`    - ${c.name} (${c.email || 'no email'})`));
        }
      } catch (e) {}

      try {
        const policies = await prisma.sLAPolicy.findMany({ take: 3, select: { name: true, isActive: true } });
        if (policies.length > 0) {
          console.log('\n  SLA Policies:');
          policies.forEach(p => console.log(`    - ${p.name} (${p.isActive ? 'Active' : 'Inactive'})`));
        }
      } catch (e) {}
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('DATABASE_URL') || error.message.includes('Environment variable')) {
      console.error('\n💡 Make sure your Prisma schema is configured correctly.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkDB();

