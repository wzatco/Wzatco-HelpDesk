#!/usr/bin/env node
/**
 * Quick Database Connection Check
 * Verifies which database (SQLite or MySQL) is being used
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  console.log('🔍 Checking Database Connection...\n');
  
  // Show DATABASE_URL (masked)
  const dbUrl = process.env.DATABASE_URL || 'NOT SET';
  const maskedUrl = dbUrl.includes('@') 
    ? dbUrl.replace(/:([^:@]+)@/, ':****@') 
    : dbUrl;
  
  console.log('📋 Configuration:');
  console.log(`   DATABASE_URL: ${maskedUrl}\n`);
  
  // Determine database type from URL
  let dbType = 'Unknown';
  if (dbUrl.startsWith('mysql://')) {
    dbType = 'MySQL';
  } else if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    dbType = 'PostgreSQL';
  } else if (dbUrl.startsWith('file:')) {
    dbType = 'SQLite';
  }
  
  console.log(`🗄️  Database Type: ${dbType}\n`);
  
  // Try to connect
  const prisma = new PrismaClient();
  
  try {
    console.log('🔌 Testing connection...');
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Connection successful!');
    
    // Try to count users
    try {
      const userCount = await prisma.user.count();
      console.log(`✅ Users in database: ${userCount}`);
      
      const agentCount = await prisma.agent.count();
      console.log(`✅ Agents in database: ${agentCount}`);
      
      const ticketCount = await prisma.conversation.count();
      console.log(`✅ Tickets in database: ${ticketCount}`);
      
      // Note: Settings table may have a different name in Prisma
      try {
        const settingCount = await prisma.settings ? await prisma.settings.count() : 'N/A';
        console.log(`✅ Settings in database: ${settingCount}`);
      } catch (e) {
        console.log(`⚠️  Settings table check skipped`);
      }
      
      const notificationCount = await prisma.notification.count();
      console.log(`✅ Notifications in database: ${notificationCount}`);
      
    } catch (queryError) {
      console.log('⚠️  Could not query tables (they may not exist yet)');
      console.log(`   Error: ${queryError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
  
  console.log('\n✅ Database check complete!');
}

checkDatabase().catch(console.error);

