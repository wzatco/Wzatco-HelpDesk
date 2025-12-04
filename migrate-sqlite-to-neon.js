/**
 * Migrate data from SQLite (dev.db) to Neon PostgreSQL
 * 
 * This script reads data from your local SQLite database
 * and inserts it into your Neon PostgreSQL database.
 */

require('dotenv').config();
const { PrismaClient: PrismaSQLite } = require('@prisma/client');
const sqlite3 = require('better-sqlite3');
const path = require('path');

// Create Prisma client for PostgreSQL (Neon)
const prismaPostgres = new (require('@prisma/client')).PrismaClient();

// Connect to SQLite directly
const sqlitePath = path.join(__dirname, 'prisma', 'dev.db');
const sqlite = sqlite3(sqlitePath);

async function migrateTable(tableName, transformFn = null) {
  try {
    console.log(`\n📦 Migrating ${tableName}...`);
    
    // Read from SQLite
    const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
    console.log(`   Found ${rows.length} records`);
    
    if (rows.length === 0) {
      console.log(`   ⏭️  Skipping (empty)`);
      return;
    }

    // Transform data if needed
    const data = transformFn ? rows.map(transformFn) : rows;
    
    // Insert into PostgreSQL
    let inserted = 0;
    for (const row of data) {
      try {
        // Remove id to let PostgreSQL generate new ones, or keep if you want same IDs
        const { id, ...rowData } = row;
        
        // Use createMany for better performance, or create for each row
        await prismaPostgres[tableName].create({
          data: {
            ...rowData,
            // Optionally keep original ID: id: id
          }
        });
        inserted++;
      } catch (error) {
        // Skip duplicates or handle errors
        if (error.code === 'P2002') {
          console.log(`   ⚠️  Skipping duplicate: ${row.id || 'unknown'}`);
        } else {
          console.error(`   ❌ Error inserting row:`, error.message);
        }
      }
    }
    
    console.log(`   ✅ Inserted ${inserted}/${rows.length} records`);
  } catch (error) {
    console.error(`   ❌ Error migrating ${tableName}:`, error.message);
  }
}

async function migrate() {
  console.log('🚀 Starting SQLite to Neon PostgreSQL migration...\n');
  
  try {
    // Test connections
    console.log('🔌 Testing connections...');
    await prismaPostgres.$connect();
    console.log('✅ Connected to Neon PostgreSQL');
    
    // Get list of tables from SQLite
    const tables = sqlite.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'
      ORDER BY name
    `).all();
    
    console.log(`\n📋 Found ${tables.length} tables to migrate\n`);
    
    // Migrate each table
    for (const { name } of tables) {
      // Map SQLite table names to Prisma model names
      const modelName = mapTableToModel(name);
      
      if (modelName && prismaPostgres[modelName]) {
        await migrateTable(modelName);
      } else {
        console.log(`⚠️  Skipping ${name} (no Prisma model found)`);
      }
    }
    
    console.log('\n✅ Migration complete!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
  } finally {
    await prismaPostgres.$disconnect();
    sqlite.close();
  }
}

function mapTableToModel(tableName) {
  // Map SQLite table names to Prisma model names (camelCase)
  const mapping = {
    'Department': 'department',
    'Role': 'role',
    'RolePermission': 'rolePermission',
    'Agent': 'agent',
    'User': 'user',
    'Customer': 'customer',
    'Conversation': 'conversation',
    'SLAPolicy': 'sLAPolicy',
    'SLAWorkflow': 'sLAWorkflow',
    'SLATimer': 'sLATimer',
    'SLABreach': 'sLABreach',
    'SLAEscalation': 'sLAEscalation',
    'Product': 'product',
    'Settings': 'settings',
    'TicketTemplate': 'ticketTemplate',
    'EscalationRule': 'escalationRule',
    'Worklog': 'worklog',
  };
  
  return mapping[tableName] || tableName.toLowerCase();
}

// Run migration
migrate();

