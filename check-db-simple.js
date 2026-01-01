const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database\n');
});

function checkTable(tableName, callback) {
  db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
    if (err) {
      if (err.message.includes('no such table')) {
        callback(0, `Table ${tableName} does not exist`);
      } else {
        callback(null, err.message);
      }
    } else {
      callback(row.count, null);
    }
  });
}

async function checkAll() {
  console.log('🔍 Checking Database State...\n');
  
  const tables = [
    'Agent',
    'User',
    'Customer',
    'Conversation',
    'Department',
    'Role',
    'SLAPolicy',
    'SLAWorkflow',
    'SLATimer',
    'Product',
    'KnowledgeBase'
  ];

  const results = {};
  
  for (const table of tables) {
    await new Promise((resolve) => {
      checkTable(table, (count, error) => {
        if (error) {
          console.log(`❌ ${table}: ${error}`);
          results[table] = 0;
        } else {
          console.log(`✅ ${table}: ${count} records`);
          results[table] = count;
        }
        resolve();
      });
    });
  }

  console.log('\n📊 Summary:');
  console.log('==================');
  const total = Object.values(results).reduce((a, b) => a + b, 0);
  console.log(`Total records across all tables: ${total}`);
  
  if (total === 0) {
    console.log('\n⚠️  Database is empty!');
    console.log('You may need to:');
    console.log('  1. Create data through the UI');
    console.log('  2. Run seed scripts');
    console.log('  3. Import data from another source');
  }

  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    }
  });
}

checkAll();

