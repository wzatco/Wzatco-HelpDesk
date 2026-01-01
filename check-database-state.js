const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabaseState() {
  try {
    console.log('🔍 Checking Database State...\n');
    
    // Check all major tables
    const counts = {
      agents: await prisma.agent.count(),
      users: await prisma.user.count(),
      customers: await prisma.customer.count(),
      conversations: await prisma.conversation.count(),
      departments: await prisma.department.count(),
      roles: await prisma.role.count(),
      slaPolicies: await prisma.sLAPolicy.count(),
      slaWorkflows: await prisma.sLAWorkflow.count(),
      slaTimers: await prisma.sLATimer.count(),
      products: await prisma.product.count(),
      knowledgeBase: await prisma.knowledgeBase.count(),
    };

    console.log('📊 Database Counts:');
    console.log('==================');
    console.log(`Agents: ${counts.agents}`);
    console.log(`Users: ${counts.users}`);
    console.log(`Customers: ${counts.customers}`);
    console.log(`Tickets/Conversations: ${counts.conversations}`);
    console.log(`Departments: ${counts.departments}`);
    console.log(`Roles: ${counts.roles}`);
    console.log(`SLA Policies: ${counts.slaPolicies}`);
    console.log(`SLA Workflows: ${counts.slaWorkflows}`);
    console.log(`SLA Timers: ${counts.slaTimers}`);
    console.log(`Products: ${counts.products}`);
    console.log(`Knowledge Base: ${counts.knowledgeBase}`);
    console.log('');

    // Show sample data if exists
    if (counts.agents > 0) {
      console.log('👤 Sample Agents:');
      const agents = await prisma.agent.findMany({ take: 3 });
      agents.forEach(a => console.log(`  - ${a.name} (${a.email || 'no email'})`));
      console.log('');
    }

    if (counts.customers > 0) {
      console.log('👥 Sample Customers:');
      const customers = await prisma.customer.findMany({ take: 3 });
      customers.forEach(c => console.log(`  - ${c.name} (${c.email || 'no email'})`));
      console.log('');
    }

    if (counts.conversations > 0) {
      console.log('🎫 Sample Tickets:');
      const tickets = await prisma.conversation.findMany({ take: 3 });
      tickets.forEach(t => console.log(`  - ${t.subject || 'No subject'} (${t.status})`));
      console.log('');
    }

    if (counts.slaPolicies > 0) {
      console.log('📋 SLA Policies:');
      const policies = await prisma.sLAPolicy.findMany({ take: 3 });
      policies.forEach(p => console.log(`  - ${p.name} (${p.isActive ? 'Active' : 'Inactive'})`));
      console.log('');
    }

    // Check if database file exists
    const fs = require('fs');
    const dbPath = './prisma/dev.db';
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      console.log(`📁 Database file: ${dbPath}`);
      console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`   Modified: ${stats.mtime}`);
    } else {
      console.log(`⚠️  Database file not found at: ${dbPath}`);
    }

    console.log('\n✅ Database check complete!');
    
    if (Object.values(counts).every(c => c === 0)) {
      console.log('\n⚠️  Database appears to be empty. You may need to:');
      console.log('   1. Seed initial data');
      console.log('   2. Create agents/users through the UI');
      console.log('   3. Import data from another source');
    }

  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseState();

