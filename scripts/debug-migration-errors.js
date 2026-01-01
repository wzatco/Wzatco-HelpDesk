/**
 * Debug script to see what errors are happening during migration
 */

require('dotenv').config();
const sqlite3 = require('better-sqlite3');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const sqlitePath = path.join(__dirname, '..', 'prisma', 'dev.db');
const sqlite = sqlite3(sqlitePath);
const prisma = new PrismaClient();

async function debugTable(tableName, modelName) {
  console.log(`\n🔍 Debugging ${tableName} -> ${modelName}\n`);
  
  // Check if table exists
  const tableExists = sqlite.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name = ?
  `).get(tableName);
  
  if (!tableExists) {
    console.log(`  ❌ Table ${tableName} does not exist in SQLite`);
    return;
  }
  
  // Check if model exists
  if (!prisma[modelName]) {
    console.log(`  ❌ Prisma model '${modelName}' not found`);
    console.log(`  Available models: ${Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_')).join(', ')}`);
    return;
  }
  
  // Get sample data
  const rows = sqlite.prepare(`SELECT * FROM ${tableName} LIMIT 3`).all();
  console.log(`  📦 Found ${rows.length} sample records`);
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    console.log(`\n  Record ${i + 1}:`);
    console.log(`    ID: ${row.id}`);
    
    // Try to convert and insert
    try {
      // Simple conversion
      const data = { ...row };
      
      // Convert booleans
      Object.keys(data).forEach(key => {
        if (typeof data[key] === 'number' && (key.includes('is') || key.includes('has') || key === 'enabled' || key === 'verified' || key === 'read')) {
          data[key] = data[key] === 1;
        }
        // Convert dates
        if (key.toLowerCase().includes('at') || key.toLowerCase().includes('date')) {
          if (typeof data[key] === 'string' && data[key]) {
            if (data[key].startsWith('+') || data[key].includes('Invalid')) {
              data[key] = new Date();
            } else {
              const date = new Date(data[key]);
              if (!isNaN(date.getTime())) {
                data[key] = date;
              } else {
                data[key] = new Date();
              }
            }
          } else if (typeof data[key] === 'number' && data[key] > 1000000000) {
            data[key] = new Date(data[key] > 1000000000000 ? data[key] : data[key] * 1000);
          }
        }
        // Handle metadata
        if (key === 'metadata' && typeof data[key] === 'string' && data[key].startsWith('{')) {
          try {
            data[key] = JSON.parse(data[key]);
          } catch (e) {
            data[key] = null;
          }
        }
      });
      
      // Try to create
      await prisma[modelName].create({
        data: data
      });
      console.log(`    ✅ Successfully inserted`);
    } catch (error) {
      console.log(`    ❌ Error: ${error.code || 'UNKNOWN'}`);
      console.log(`    Message: ${error.message.substring(0, 200)}`);
      if (error.meta) {
        console.log(`    Meta: ${JSON.stringify(error.meta)}`);
      }
    }
  }
}

async function main() {
  try {
    await prisma.$connect();
    
    await debugTable('OTPVerification', 'oTVerification');
    await debugTable('SLAPolicy', 'sLAPolicy');
    await debugTable('Settings', 'settings');
    await debugTable('Department', 'department');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
    sqlite.close();
  }
}

main();

