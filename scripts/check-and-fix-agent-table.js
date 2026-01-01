const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function checkAndFixAgentTable() {
  try {
    console.log('Checking Agent table structure...\n');
    
    // Check if accountId column exists by trying to query it
    try {
      await prisma.$queryRaw`SELECT id, accountId FROM Agent LIMIT 1`;
      console.log('✅ accountId column exists!');
    } catch (error) {
      if (error.message.includes('no such column: accountId') || error.message.includes('accountId') && error.message.includes('does not exist')) {
        console.log('⚠️  accountId column is missing!');
        console.log('Applying migration to fix the table...\n');
        
        // Read the migration SQL
        const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', '20251127000000_add_missing_agent_fields', 'migration.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        // Split the SQL by semicolons and execute each statement
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));
        
        for (const statement of statements) {
          if (statement.trim()) {
            try {
              await prisma.$executeRawUnsafe(statement);
              console.log('✓ Executed statement');
            } catch (err) {
              // Some statements might fail if column already exists, that's ok
              if (!err.message.includes('duplicate column name')) {
                console.error('Error executing statement:', err.message);
              }
            }
          }
        }
        
        console.log('\n✅ Migration applied successfully!');
        
        // Verify the fix
        try {
          await prisma.$queryRaw`SELECT id, accountId, slug FROM Agent LIMIT 1`;
          console.log('✅ Verification successful - accountId column now exists!');
        } catch (verifyError) {
          console.error('❌ Verification failed:', verifyError.message);
        }
      } else {
        console.error('Error checking table:', error.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixAgentTable();
