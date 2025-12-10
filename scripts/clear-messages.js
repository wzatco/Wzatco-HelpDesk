// Script to clear all messages from the database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearMessages() {
  try {
    console.log('🗑️  Clearing all messages from database...');
    
    // Delete all messages
    const result = await prisma.message.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.count} message(s) from the database.`);
  } catch (error) {
    console.error('❌ Error clearing messages:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearMessages();

