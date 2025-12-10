const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const logFile = path.join(__dirname, 'db-fix-log.txt');

function log(message) {
  console.log(message);
  fs.appendFileSync(logFile, message + '\n');
}

async function test() {
  log('Starting database check...');
  
  try {
    // Try to select accountId
    const result = await prisma.$queryRaw`SELECT id, accountId FROM Agent LIMIT 1`;
    log('SUCCESS: accountId column exists!');
    log('Sample data: ' + JSON.stringify(result));
  } catch (error) {
    log('ERROR: ' + error.message);
    
    if (error.message.includes('accountId')) {
      log('Attempting to fix database...');
      
      // Apply the migration SQL manually
      const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', '20251127000000_add_missing_agent_fields', 'migration.sql');
      
      if (!fs.existsSync(migrationPath)) {
        log('Migration file not found at: ' + migrationPath);
        await prisma.$disconnect();
        return;
      }
      
      const sql = fs.readFileSync(migrationPath, 'utf8');
      log('Read migration file, length: ' + sql.length);
      
      try {
        await prisma.$executeRawUnsafe(sql);
        log('Migration executed successfully!');
        
        // Verify
        const verify = await prisma.$queryRaw`SELECT id, accountId FROM Agent LIMIT 1`;
        log('Verification successful! Data: ' + JSON.stringify(verify));
      } catch (execError) {
        log('Error executing migration: ' + execError.message);
      }
    }
  }
  
  await prisma.$disconnect();
  log('Done!');
}

test().catch(err => {
  log('Fatal error: ' + err.message);
  prisma.$disconnect();
});

