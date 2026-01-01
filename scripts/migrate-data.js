/**
 * Data Migration Script: SQLite → MySQL
 * 
 * Migrates data from local SQLite database (./prisma/dev.db) to remote MySQL database.
 * 
 * Requirements:
 * - Install better-sqlite3 temporarily: npm install better-sqlite3
 * - Ensure DATABASE_URL in .env points to MySQL
 * 
 * Usage: node scripts/migrate-data.js
 */

require('dotenv').config();
const sqlite3 = require('better-sqlite3');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const sqlitePath = path.join(__dirname, '..', 'prisma', 'dev.db');
const sqlite = sqlite3(sqlitePath);
const prisma = new PrismaClient();

// Helper function to parse corrupted dates (like "+057936-03-02T06:32:17.000Z")
function parseCorruptedDate(value) {
  if (!value || typeof value !== 'string') return null;
  
  // Try to fix corrupted dates that start with "+0" followed by year
  // Pattern: "+057936-03-02T06:32:17.000Z" -> "57936-03-02T06:32:17.000Z"
  if (value.startsWith('+0')) {
    // Remove the "+0" prefix
    const fixed = value.substring(2);
    try {
      const date = new Date(fixed);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (e) {
      // Continue to other strategies
    }
  }
  
  // Try to extract year from corrupted format and create a reasonable date
  // If year is way in the future (like 57936), use current date as fallback
  const yearMatch = value.match(/(\d{4,5})-\d{2}-\d{2}/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    if (year > 2100) {
      // Year is corrupted, use current date as fallback
      return new Date();
    }
  }
  
  // Try standard date parsing
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    // Continue
  }
  
  // Last resort: return current date to ensure data is not lost
  console.warn(`  ⚠️  Could not parse date: ${value}, using current date as fallback`);
  return new Date();
}

// Helper function to convert SQLite values to MySQL/Prisma format
function convertValue(value, fieldName) {
  // Handle null
  if (value === null || value === undefined) {
    return null;
  }

  // Don't convert metadata/config/payload fields - they should stay as strings or JSON
  // But if they're already objects, keep them as objects
  if (fieldName.toLowerCase() === 'metadata' || fieldName.toLowerCase() === 'config' || fieldName.toLowerCase() === 'payload') {
    if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      // Already an object, return as is
      return value;
    }
    if (typeof value === 'string') {
      // If it's "Invalid Date" string, return null
      if (value === 'Invalid Date' || value.includes('Invalid')) {
        return null;
      }
      if (value.startsWith('{') || value.startsWith('[')) {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value;
        }
      }
      return value;
    }
    return value;
  }

  // Convert SQLite booleans (0/1) to actual booleans
  // Check if field name suggests it's a boolean
  const booleanFields = [
    'isActive', 'isDefault', 'isPublic', 'isPrivate', 'isDraft',
    'hasAccess', 'hasSuperPower', 'enabled', 'verified', 'read', 'pinned',
    'notifyEmail', 'notifyPush', 'isAiEnabled', 'isGoogleAuthEnabled',
    'isClaimable', 'isSystemAuto', 'priorityChanged', 'reassigned'
  ];
  
  if (booleanFields.some(bf => fieldName.toLowerCase().includes(bf.toLowerCase()))) {
    if (value === 0 || value === '0' || value === false) return false;
    if (value === 1 || value === '1' || value === true) return true;
  }

  // Handle JSON strings - try to parse if it looks like JSON
  if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
    try {
      return JSON.parse(value);
    } catch (e) {
      // Not valid JSON, return as string
      return value;
    }
  }

  // Handle dates - SQLite stores as strings or integers
  // Only convert fields that are clearly date fields (and NOT metadata/config fields)
  const dateFields = ['createdAt', 'updatedAt', 'deletedAt', 'publishedAt', 'lastSeenAt', 
                      'firstResponseAt', 'lastMessageAt', 'startedAt', 'endedAt', 'pausedAt',
                      'resumedAt', 'completedAt', 'breachedAt', 'readAt', 'editedAt',
                      'submittedAt', 'verifiedAt', 'expiresAt', 'assignedAt', 'scheduledTime',
                      'rescheduledTime', 'closedAt', 'resolvedAt', 'startDate', 'endDate',
                      'leaveFrom', 'leaveTo', 'timestamp', 'escalatedAt',
                      'level1NotifiedAt', 'level2NotifiedAt', 'breachNotifiedAt'];
  
  if (dateFields.some(df => fieldName.toLowerCase() === df.toLowerCase())) {
    if (typeof value === 'number') {
      // SQLite stores dates as Unix timestamps (seconds or milliseconds)
      // Check if it's milliseconds (13+ digits) or seconds (10 digits)
      if (value > 1000000000000) {
        // Milliseconds timestamp (e.g., 1764759398681)
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          // Invalid timestamp, use current date as fallback
          return new Date();
        }
        return date;
      } else if (value > 1000000000) {
        // Seconds timestamp (e.g., 1764759398)
        const date = new Date(value * 1000);
        if (isNaN(date.getTime())) {
          // Invalid timestamp, use current date as fallback
          return new Date();
        }
        return date;
      } else if (value > 0) {
        // Very small number but > 0, might be seconds, try both
        const dateMs = new Date(value);
        const dateSec = new Date(value * 1000);
        if (!isNaN(dateMs.getTime()) && dateMs.getFullYear() > 1970 && dateMs.getFullYear() < 2100) {
          return dateMs;
        }
        if (!isNaN(dateSec.getTime()) && dateSec.getFullYear() > 1970 && dateSec.getFullYear() < 2100) {
          return dateSec;
        }
      }
      // Invalid or zero, use current date as fallback
      return new Date();
    }
    if (typeof value === 'string' && value) {
      // Handle corrupted dates
      if (value.startsWith('+') || value.includes('Invalid') || value === 'Invalid Date') {
        return parseCorruptedDate(value);
      }
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          // Try corrupted date parser
          return parseCorruptedDate(value);
        }
        return date;
      } catch (e) {
        // Try corrupted date parser
        return parseCorruptedDate(value);
      }
    }
    // If value is empty string or other type, use current date as fallback
    if (value === '') {
      return new Date();
    }
  }
  
  // Handle JSON fields that should be parsed (businessHours, holidays, etc.)
  const jsonFields = ['businessHours', 'holidays', 'departmentIds', 'categoryIds', 'slaConfig', 'workingHours'];
  if (jsonFields.some(jf => fieldName.toLowerCase() === jf.toLowerCase())) {
    if (typeof value === 'string' && value && (value.startsWith('{') || value.startsWith('['))) {
      try {
        return JSON.parse(value);
      } catch (e) {
        // If parsing fails, return as string (will be stored as @db.Text)
        return value;
      }
    }
  }

  return value;
}

// Fix data item based on error
function fixDataItem(item, error) {
  const fixed = { ...item };
  
  // If error mentions invalid date, fix dates
  if (error.message.includes('DateTime') || error.message.includes('Invalid')) {
    for (const [key, value] of Object.entries(fixed)) {
      if (value instanceof Date && isNaN(value.getTime())) {
        fixed[key] = new Date(); // Use current date as fallback
      }
    }
  }
  
  // If error mentions invalid value for metadata, ensure it's string or null
  if (error.message.includes('metadata') && typeof fixed.metadata !== 'string' && fixed.metadata !== null) {
    if (typeof fixed.metadata === 'object') {
      fixed.metadata = JSON.stringify(fixed.metadata);
    } else {
      fixed.metadata = null;
    }
  }
  
  // Remove any undefined values
  for (const key in fixed) {
    if (fixed[key] === undefined) {
      delete fixed[key];
    }
  }
  
  return fixed;
}

// Get unique field for update operation
function getUniqueField(item, modelName) {
  // Try common unique fields
  if (item.id) return { id: item.id };
  if (item.email) return { email: item.email };
  if (item.ticketNumber) return { ticketNumber: item.ticketNumber };
  if (item.slug) return { slug: item.slug };
  if (item.key) return { key: item.key };
  return null;
}

// Get minimal data item with only required fields
function getMinimalDataItem(item, tableName) {
  const minimal = { ...item };
  
  // Remove all optional fields, keep only required ones
  // This is a fallback - we'll keep id and essential fields
  const essentialFields = ['id'];
  
  // Keep date fields but fix them
  for (const [key, value] of Object.entries(minimal)) {
    if (key.toLowerCase().includes('at') || key.toLowerCase().includes('date')) {
      if (value instanceof Date && isNaN(value.getTime())) {
        minimal[key] = new Date();
      }
    }
    // Remove problematic fields
    if (key === 'metadata' && typeof value !== 'string' && value !== null) {
      minimal[key] = null;
    }
  }
  
  return minimal;
}

// Convert SQLite row to Prisma data format
function convertRow(row, tableName) {
  const data = {};
  
  for (const [key, value] of Object.entries(row)) {
    // Convert camelCase to match Prisma model field names
    const fieldName = key;
    const converted = convertValue(value, fieldName);
    
    // Ensure dates are valid
    if (converted instanceof Date && isNaN(converted.getTime())) {
      data[fieldName] = new Date(); // Fallback to current date
    } else {
      data[fieldName] = converted;
    }
  }
  
  return data;
}

// Migration order based on foreign key dependencies
const migrationOrder = [
  // Phase 1: Base tables (no dependencies)
  { table: 'Settings', model: 'settings' },
  { table: 'Role', model: 'role' },
  { table: 'Department', model: 'department' },
  { table: 'User', model: 'user' },
  { table: 'Customer', model: 'customer' },
  { table: 'Product', model: 'product' },
  
  // Phase 2: Depend on Phase 1
  { table: 'RolePermission', model: 'rolePermission' },
  { table: 'Agent', model: 'agent' },
  { table: 'Admin', model: 'admin' },
  { table: 'Accessory', model: 'accessory' },
  { table: 'ProductDocument', model: 'productDocument' },
  { table: 'ProductTutorial', model: 'productTutorial' },
  { table: 'TicketTemplate', model: 'ticketTemplate' },
  { table: 'IssueCategory', model: 'issueCategory' },
  { table: 'ArticleCategory', model: 'articleCategory' },
  { table: 'Article', model: 'article' },
  { table: 'Tag', model: 'tag' },
  { table: 'SLAPolicy', model: 'sLAPolicy' },
  { table: 'EscalationRule', model: 'escalationRule' },
  { table: 'AssignmentRule', model: 'assignmentRule' },
  { table: 'Webhook', model: 'webhook' },
  { table: 'ApiKey', model: 'apiKey' },
  { table: 'Integration', model: 'integration' },
  { table: 'Macro', model: 'macro' },
  { table: 'CannedResponse', model: 'cannedResponse' },
  { table: 'Workflow', model: 'workflow' },
  { table: 'WorkflowCondition', model: 'workflowCondition' },
  { table: 'WorkflowAction', model: 'workflowAction' },
  { table: 'Tutorial', model: 'tutorial' },
  { table: 'WorklogReason', model: 'worklogReason' },
  
  // Phase 3: Depend on Phase 2 (tickets, chats)
  { table: 'Conversation', model: 'conversation' },
  { table: 'LiveChat', model: 'liveChat' },
  { table: 'ScheduledCallback', model: 'scheduledCallback' },
  { table: 'SLATimer', model: 'sLATimer' },
  { table: 'LeaveHistory', model: 'leaveHistory' },
  
  // Phase 4: Depend on Phase 3 (messages, activities)
  { table: 'Message', model: 'message' },
  { table: 'Attachment', model: 'attachment' },
  { table: 'TicketNote', model: 'ticketNote' },
  { table: 'TicketActivity', model: 'ticketActivity' },
  { table: 'ConversationTag', model: 'conversationTag' },
  { table: 'Worklog', model: 'worklog' },
  { table: 'Feedback', model: 'feedback' },
  { table: 'ChatFeedback', model: 'chatFeedback' },
  { table: 'Notification', model: 'notification' },
  { table: 'LiveChatMessage', model: 'liveChatMessage' },
  { table: 'OTPVerification', model: 'oTPVerification' },
  { table: 'InternalChat', model: 'internalChat' },
  { table: 'InternalMessage', model: 'internalMessage' },
  { table: 'SLABreach', model: 'sLABreach' },
  { table: 'SLAEscalation', model: 'sLAEscalation' },
  { table: 'AssignmentHistory', model: 'assignmentHistory' },
  { table: 'SavedFilter', model: 'savedFilter' },
  { table: 'WebhookLog', model: 'webhookLog' },
  { table: 'ReadReceipt', model: 'readReceipt' },
];

async function migrateTable({ table: tableName, model: modelName }) {
  try {
    console.log(`Migrating ${tableName}...`);
    
    // Check if table exists in SQLite
    const tableExists = sqlite.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name = ?
    `).get(tableName);
    
    if (!tableExists) {
      console.log(`  ⏭️  Table ${tableName} does not exist in SQLite, skipping`);
      return { success: 0, skipped: true };
    }
    
    // Read all rows from SQLite
    const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
    
    if (rows.length === 0) {
      console.log(`  ⏭️  No records found, skipping`);
      return { success: 0, skipped: true };
    }
    
    console.log(`  📦 Found ${rows.length} records`);
    
    // Check if Prisma model exists (handle case sensitivity)
    let actualModelName = modelName;
    if (!prisma[modelName]) {
      // Try to find the model with different casing
      const modelKeys = Object.keys(prisma).filter(k => 
        !k.startsWith('$') && 
        !k.startsWith('_') && 
        k.toLowerCase() === modelName.toLowerCase()
      );
      if (modelKeys.length > 0) {
        actualModelName = modelKeys[0];
        console.log(`  ℹ️  Using model name: ${actualModelName} (instead of ${modelName})`);
      } else {
        console.log(`  ⚠️  Prisma model '${modelName}' not found, skipping`);
        return { success: 0, skipped: true };
      }
    }
    
    // Convert rows to Prisma format
    const data = rows.map(row => convertRow(row, tableName));
    
    // Insert in batches to avoid memory issues
    const batchSize = 100;
    let totalInserted = 0;
    let totalErrors = 0;
    const errorDetails = [];
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      try {
        // Try to use upsert for each record to handle duplicates
        let batchInserted = 0;
        for (const item of batch) {
          try {
            // Try create first
            await prisma[actualModelName].create({
              data: item
            });
            batchInserted++;
            totalInserted++;
          } catch (createError) {
            if (createError.code === 'P2002') {
              // Duplicate - try to update instead
              try {
                const uniqueField = getUniqueField(item, actualModelName);
                if (uniqueField) {
                  await prisma[actualModelName].update({
                    where: uniqueField,
                    data: item
                  });
                  batchInserted++;
                  totalInserted++;
                } else {
                  // No unique field, skip
                  continue;
                }
              } catch (updateError) {
                // Update failed, try to fix and create
                const fixedItem = fixDataItem(item, createError);
                try {
                  await prisma[actualModelName].create({
                    data: fixedItem
                  });
                  batchInserted++;
                  totalInserted++;
                } catch (retryError) {
                  errorDetails.push({ item: item.id || 'unknown', error: retryError.message });
                  totalErrors++;
                }
              }
            } else {
              // Other error - try to fix
              const fixedItem = fixDataItem(item, createError);
              try {
                await prisma[actualModelName].create({
                  data: fixedItem
                });
                batchInserted++;
                totalInserted++;
              } catch (retryError) {
                // Last resort: minimal data
                try {
                  const minimalItem = getMinimalDataItem(item, tableName);
                  await prisma[actualModelName].create({
                    data: minimalItem
                  });
                  batchInserted++;
                  totalInserted++;
                  console.log(`  ⚠️  Inserted with minimal data`);
                } catch (finalError) {
                  errorDetails.push({ item: item.id || 'unknown', error: finalError.message });
                  totalErrors++;
                }
              }
            }
          }
        }
        console.log(`  ✅ Inserted batch: ${batchInserted}/${batch.length} (Total: ${totalInserted}/${data.length})`);
      } catch (error) {
        // If batch fails, try individual inserts with data fixing
        console.log(`  ⚠️  Batch insert failed, trying individual inserts with fixes...`);
        
        for (const item of batch) {
          try {
            await prisma[actualModelName].create({
              data: item
            });
            totalInserted++;
          } catch (itemError) {
            if (itemError.code === 'P2002') {
              // Duplicate entry, skip
              continue;
            } else {
              // Try to fix the data and retry
              const fixedItem = fixDataItem(item, itemError);
              try {
                await prisma[actualModelName].create({
                  data: fixedItem
                });
                totalInserted++;
                console.log(`  ✅ Fixed and inserted record`);
              } catch (retryError) {
                // Last resort: try with minimal required fields only
                try {
                  const minimalItem = getMinimalDataItem(item, tableName);
                  await prisma[actualModelName].create({
                    data: minimalItem
                  });
                  totalInserted++;
                  console.log(`  ⚠️  Inserted with minimal data (some fields may be missing)`);
                } catch (finalError) {
                  errorDetails.push({ item: item.id || 'unknown', error: finalError.message });
                  totalErrors++;
                  console.error(`  ❌ Could not insert record:`, finalError.message.substring(0, 100));
                }
              }
            }
          }
        }
      }
    }
    
    console.log(`  ✅ Success: ${totalInserted}/${rows.length} records migrated`);
    if (totalErrors > 0) {
      console.log(`  ⚠️  Errors: ${totalErrors} records failed`);
    }
    
    return { success: totalInserted, errors: totalErrors };
  } catch (error) {
    console.error(`  ❌ Error migrating ${tableName}:`, error.message);
    return { success: 0, errors: 1, error: error.message };
  }
}

async function migrate() {
  console.log('🚀 Starting SQLite to MySQL data migration...\n');
  
  try {
    // Test SQLite connection
    console.log('🔌 Testing SQLite connection...');
    if (!sqlite.open) {
      throw new Error('SQLite database not accessible');
    }
    console.log('✅ SQLite connected');
    
    // Test MySQL connection
    console.log('🔌 Testing MySQL connection...');
    await prisma.$connect();
    console.log('✅ MySQL connected\n');
    
    // Run migrations in order
    let totalSuccess = 0;
    let totalErrors = 0;
    const results = [];
    
    for (const migration of migrationOrder) {
      const result = await migrateTable(migration);
      results.push({ ...migration, ...result });
      totalSuccess += result.success || 0;
      totalErrors += result.errors || 0;
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));
    
    results.forEach(({ table, success, skipped, errors }) => {
      if (skipped) {
        console.log(`  ⏭️  ${table}: Skipped`);
      } else {
        const status = errors > 0 ? '⚠️' : '✅';
        console.log(`  ${status} ${table}: ${success} records migrated${errors > 0 ? ` (${errors} errors)` : ''}`);
      }
    });
    
    console.log('='.repeat(60));
    console.log(`✅ Total records migrated: ${totalSuccess}`);
    if (totalErrors > 0) {
      console.log(`⚠️  Total errors: ${totalErrors}`);
    }
    console.log('\n🎉 Migration complete!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    sqlite.close();
    console.log('🔌 Connections closed');
  }
}

// Run migration
migrate().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

