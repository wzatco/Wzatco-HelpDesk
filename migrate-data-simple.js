/**
 * Simple migration script: SQLite to Neon PostgreSQL
 * Reads from local SQLite and writes to Neon PostgreSQL
 */

require('dotenv').config();
const sqlite3 = require('better-sqlite3');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const sqlitePath = path.join(__dirname, 'prisma', 'dev.db');
const sqlite = sqlite3(sqlitePath);
const prisma = new PrismaClient();

// Tables to migrate (in order - respect foreign keys)
const tables = [
  'Department',
  'Role',
  'RolePermission',
  'User',
  'Agent',
  'Customer',
  'Product',
  'Settings',
  'Conversation',
  'SLAPolicy',
  'SLAWorkflow',
  'SLATimer',
  'SLABreach',
  'SLAEscalation',
  'TicketTemplate',
  'EscalationRule',
  'Worklog',
];

async function migrateTable(tableName) {
  try {
    const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
    
    if (rows.length === 0) {
      console.log(`⏭️  ${tableName}: 0 records (skipping)`);
      return;
    }

    console.log(`\n📦 ${tableName}: ${rows.length} records`);
    
    // Map table name to Prisma model
    const modelMap = {
      'Department': 'department',
      'Role': 'role',
      'RolePermission': 'rolePermission',
      'User': 'user',
      'Agent': 'agent',
      'Customer': 'customer',
      'Product': 'product',
      'Settings': 'settings',
      'Conversation': 'conversation',
      'SLAPolicy': 'sLAPolicy',
      'SLAWorkflow': 'sLAWorkflow',
      'SLATimer': 'sLATimer',
      'SLABreach': 'sLABreach',
      'SLAEscalation': 'sLAEscalation',
      'TicketTemplate': 'ticketTemplate',
      'EscalationRule': 'escalationRule',
      'Worklog': 'worklog',
    };

    const modelName = modelMap[tableName];
    if (!modelName || !prisma[modelName]) {
      console.log(`   ⚠️  No Prisma model found, skipping`);
      return;
    }

    let success = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        // Convert SQLite row to Prisma format
        const data = { ...row };
        
        // Convert data types
        Object.keys(data).forEach(key => {
          const value = data[key];
          
          // Convert integers to booleans (SQLite stores booleans as 0/1)
          if (typeof value === 'number' && (key.includes('is') || key.includes('has') || key === 'enabled' || key === 'active' || key === 'draft' || key === 'default' || key === 'paused')) {
            data[key] = value === 1;
          }
          
          // Convert integer timestamps to Date objects
          if (typeof value === 'number' && (key.includes('At') || key.includes('Time') || key === 'createdAt' || key === 'updatedAt' || key === 'publishedAt' || key === 'lastSeenAt' || key === 'firstResponseAt' || key === 'lastMessageAt')) {
            // Check if it's a Unix timestamp (milliseconds or seconds)
            if (value > 1000000000000) {
              // Milliseconds timestamp
              data[key] = new Date(value);
            } else if (value > 1000000000) {
              // Seconds timestamp
              data[key] = new Date(value * 1000);
            }
          }
          
          // Convert string dates to Date objects
          if (value && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
            data[key] = new Date(value);
          }
          
          // Handle null values
          if (value === null || value === undefined) {
            data[key] = null;
          }
        });

        // Remove id to let PostgreSQL generate new ones (or keep if you want same IDs)
        const { id, ...insertData } = data;

        await prisma[modelName].create({
          data: insertData
        });
        
        success++;
      } catch (error) {
        if (error.code === 'P2002') {
          // Duplicate - skip
          errors++;
        } else {
          console.error(`   ❌ Error: ${error.message}`);
          errors++;
        }
      }
    }

    console.log(`   ✅ Inserted: ${success}, Errors: ${errors}`);
    
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Migrating SQLite to Neon PostgreSQL...\n');
  
  try {
    // Test PostgreSQL connection
    await prisma.$connect();
    console.log('✅ Connected to Neon PostgreSQL\n');

    // Migrate each table
    for (const table of tables) {
      await migrateTable(table);
    }

    console.log('\n✅ Migration complete!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
    sqlite.close();
  }
}

main();

