/**
 * Clear MySQL database and re-run migration
 * This ensures a complete fresh migration
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🗑️  Clearing MySQL database...\n');
  
  // Delete in reverse dependency order
  const models = [
    'readReceipt', 'webhookLog', 'savedFilter', 'assignmentHistory', 'sLAEscalation', 'sLABreach',
    'internalMessage', 'internalChat', 'oTVerification', 'liveChatMessage', 'notification',
    'chatFeedback', 'feedback', 'worklog', 'conversationTag', 'ticketActivity', 'ticketNote',
    'attachment', 'message', 'leaveHistory', 'sLATimer', 'scheduledCallback', 'liveChat',
    'conversation', 'worklogReason', 'tutorial', 'workflowAction', 'workflowCondition', 'workflow',
    'cannedResponse', 'macro', 'integration', 'apiKey', 'webhook', 'assignmentRule', 'escalationRule',
    'sLAPolicy', 'tag', 'article', 'articleCategory', 'issueCategory', 'ticketTemplate',
    'productTutorial', 'productDocument', 'accessory', 'admin', 'agent', 'rolePermission',
    'product', 'customer', 'user', 'department', 'role', 'settings'
  ];
  
  for (const model of models) {
    try {
      if (prisma[model] && prisma[model].deleteMany) {
        const result = await prisma[model].deleteMany({});
        if (result.count > 0) {
          console.log(`  ✅ Deleted ${result.count} records from ${model}`);
        }
      }
    } catch (error) {
      console.log(`  ⚠️  Error deleting ${model}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Database cleared!\n');
}

async function main() {
  try {
    await prisma.$connect();
    await clearDatabase();
    console.log('✅ Ready for fresh migration. Run: node scripts/migrate-data.js');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

