/**
 * Migrate SQLite to Neon PostgreSQL with ID mapping
 * Preserves foreign key relationships by mapping old IDs to new IDs
 */

require('dotenv').config();
const sqlite3 = require('better-sqlite3');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const sqlitePath = path.join(__dirname, 'prisma', 'dev.db');
const sqlite = sqlite3(sqlitePath);
const prisma = new PrismaClient();

// ID mapping: oldId -> newId
const idMaps = {};

// Tables in dependency order (parent tables first)
const tables = [
  { name: 'Department', model: 'department' },
  { name: 'Role', model: 'role' },
  { name: 'User', model: 'user' },
  { name: 'RolePermission', model: 'rolePermission' },
  { name: 'Agent', model: 'agent' },
  { name: 'Customer', model: 'customer' },
  { name: 'Product', model: 'product' },
  { name: 'Settings', model: 'settings' },
  { name: 'SLAPolicy', model: 'sLAPolicy' },
  { name: 'Conversation', model: 'conversation' },
  { name: 'SLAWorkflow', model: 'sLAWorkflow' },
  { name: 'SLATimer', model: 'sLATimer' },
  { name: 'SLABreach', model: 'sLABreach' },
  { name: 'SLAEscalation', model: 'sLAEscalation' },
  { name: 'TicketTemplate', model: 'ticketTemplate' },
  { name: 'EscalationRule', model: 'escalationRule' },
  { name: 'Worklog', model: 'worklog' },
];

function convertValue(value, key) {
  if (value === null || value === undefined) return null;
  
  // Convert timestamps FIRST (before booleans, since timestamps are numbers)
  if (typeof value === 'number' && (
    key.includes('At') || key.includes('Time') || 
    key === 'createdAt' || key === 'updatedAt' || 
    key === 'publishedAt' || key === 'lastSeenAt' ||
    key === 'firstResponseAt' || key === 'lastMessageAt'
  )) {
    // Check if it's a timestamp (large number) vs boolean (0/1)
    if (value > 1000000000000) return new Date(value); // milliseconds timestamp
    if (value > 1000000000) return new Date(value * 1000); // seconds timestamp
    // If it's a small number and ends with 'At', it might be invalid, return null
    if (key.includes('At')) return null;
  }
  
  // Convert booleans (SQLite stores as 0/1) - but only if not a timestamp
  if (typeof value === 'number' && value <= 1 && (
    key.includes('is') || key.includes('has') || 
    key === 'enabled' || key === 'active' || 
    key === 'draft' || key === 'default' ||
    key.includes('pause') || key.includes('Pause') ||
    key === 'useBusinessHours'
  )) {
    return value === 1;
  }
  
  // Convert string dates
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(value);
  }
  
  return value;
}

function mapForeignKeys(data, tableName) {
  const mapped = { ...data };
  
  // Map foreign key fields based on table
  const fkMappings = {
    'RolePermission': { roleId: 'Role' },
    'Agent': { departmentId: 'Department', roleId: 'Role', accountId: 'User' },
    'User': { roleId: 'Role' },
    'Conversation': { assigneeId: 'Agent', customerId: 'Customer', departmentId: 'Department', productId: 'Product' },
    'SLAWorkflow': { policyId: 'SLAPolicy' },
    'SLATimer': { conversationId: 'Conversation', policyId: 'SLAPolicy' },
    'SLABreach': { timerId: 'SLATimer', conversationId: 'Conversation' },
    'SLAEscalation': { breachId: 'SLABreach', conversationId: 'Conversation' },
    'TicketTemplate': { productId: 'Product', departmentId: 'Department' },
    'Worklog': { agentId: 'Agent', conversationId: 'Conversation' },
  };
  
  const mapping = fkMappings[tableName];
  if (mapping) {
    Object.keys(mapping).forEach(fkField => {
      if (mapped[fkField] && idMaps[mapping[fkField]]) {
        const oldId = mapped[fkField];
        const newId = idMaps[mapping[fkField]][oldId];
        if (newId) {
          mapped[fkField] = newId;
        } else {
          // Foreign key doesn't exist, set to null
          mapped[fkField] = null;
        }
      }
    });
  }
  
  return mapped;
}

async function migrateTable({ name: tableName, model: modelName }) {
  try {
    const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
    
    if (rows.length === 0) {
      console.log(`⏭️  ${tableName}: 0 records`);
      return;
    }

    console.log(`\n📦 ${tableName}: ${rows.length} records`);
    
    if (!prisma[modelName]) {
      console.log(`   ⚠️  Model ${modelName} not found, skipping`);
      return;
    }

    // Initialize ID map for this table
    if (!idMaps[tableName]) {
      idMaps[tableName] = {};
    }

    let success = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        const oldId = row.id;
        
        // Convert data types
        const data = {};
        Object.keys(row).forEach(key => {
          data[key] = convertValue(row[key], key);
        });
        
        // Map foreign keys
        const mappedData = mapForeignKeys(data, tableName);
        
        // For SLAPolicy, keep the original ID since SLAWorkflow references it
        let result;
        let insertData;
        
        if (tableName === 'SLAPolicy') {
          result = await prisma[modelName].create({
            data: {
              ...mappedData,
              id: oldId, // Keep original ID
            }
          });
        } else {
          // Remove id to let PostgreSQL generate new one
          const { id, ...rest } = mappedData;
          insertData = rest;
          result = await prisma[modelName].create({
            data: insertData
          });
        }
        
        // Store ID mapping
        idMaps[tableName][oldId] = result.id;
        success++;
      } catch (error) {
        if (error.code === 'P2002') {
          // Duplicate - try to find existing record
          try {
            const existing = await prisma[modelName].findFirst({
              where: { email: row.email || undefined, name: row.name || undefined }
            });
            if (existing) {
              idMaps[tableName][row.id] = existing.id;
              success++;
              continue;
            }
          } catch {}
        }
        errors++;
        if (errors <= 3) {
          console.error(`   ❌ Error: ${error.message}`);
          console.error(`   📋 Error code: ${error.code || 'N/A'}`);
          if (errors === 1) {
            console.error(`   📋 Table: ${tableName}, Model: ${modelName}`);
            console.error(`   📋 Row keys:`, Object.keys(mappedData).join(', '));
            console.error(`   📋 Sample data:`, JSON.stringify(Object.fromEntries(Object.entries(mappedData).slice(0, 5)), null, 2));
          }
        }
      }
    }

    console.log(`   ✅ Inserted: ${success}, Errors: ${errors}`);
    
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Migrating SQLite to Neon PostgreSQL with ID mapping...\n');
  
  try {
    await prisma.$connect();
    console.log('✅ Connected to Neon PostgreSQL\n');

    // Migrate in order (respecting dependencies)
    for (const table of tables) {
      await migrateTable(table);
    }

    console.log('\n✅ Migration complete!');
    console.log(`\n📊 Summary:`);
    tables.forEach(({ name }) => {
      if (idMaps[name]) {
        console.log(`   ${name}: ${Object.keys(idMaps[name]).length} records migrated`);
      }
    });
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
    sqlite.close();
  }
}

main();

