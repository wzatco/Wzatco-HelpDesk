/**
 * Universal Rescue Script - Force Migration of Problematic Records
 * 
 * This script aggressively fixes and migrates records that failed during initial migration
 * due to validation errors, duplicates, or corrupted data.
 * 
 * Strategy: Sanitize bad data + Use upsert to force insert/update
 */

require('dotenv').config();
const sqlite3 = require('better-sqlite3');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const sqlitePath = path.join(__dirname, '..', 'prisma', 'dev.db');
const sqlite = sqlite3(sqlitePath);
const prisma = new PrismaClient();

// Helper: Generate missing email
function generateEmail(id, prefix = 'missing') {
  return `${prefix}_${id.substring(0, 8)}@wzatco.com`;
}

// Helper: Generate slug from name
function generateSlug(name) {
  if (!name) return `user-${Date.now()}`;
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

// Helper: Fix corrupted dates
function fixDate(value, strict = false) {
  if (!value) return new Date();
  
  if (typeof value === 'number') {
    // Unix timestamp (milliseconds or seconds)
    if (value > 1000000000000) {
      const date = new Date(value);
      if (isNaN(date.getTime())) return new Date();
      // Check year range if strict mode
      if (strict) {
        const year = date.getFullYear();
        if (year > 3000 || year < 1970) return new Date();
      }
      return date;
    } else if (value > 1000000000) {
      const date = new Date(value * 1000);
      if (isNaN(date.getTime())) return new Date();
      // Check year range if strict mode
      if (strict) {
        const year = date.getFullYear();
        if (year > 3000 || year < 1970) return new Date();
      }
      return date;
    }
    return new Date();
  }
  
  if (typeof value === 'string') {
    // Skip corrupted dates
    if (value.startsWith('+') || value.includes('Invalid') || value === 'Invalid Date') {
      return new Date();
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) return new Date();
    // Check year range if strict mode (for Notifications)
    if (strict) {
      const year = date.getFullYear();
      if (year > 3000 || year < 1970) {
        return new Date(); // Force to current date if invalid year
      }
    }
    return date;
  }
  
  return new Date();
}

// Helper: Parse JSON safely
function parseJSON(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value; // Return as string if parsing fails
    }
  }
  return value;
}

// Helper: Convert SQLite row to sanitized Prisma data
function sanitizeRow(row, tableName) {
  const data = { ...row };
  
  // Convert booleans
  Object.keys(data).forEach(key => {
    const value = data[key];
    
    // Booleans
    if (typeof value === 'number' && (
      key.includes('is') || key.includes('has') || 
      key === 'enabled' || key === 'verified' || key === 'read' || 
      key === 'active' || key === 'default' || key === 'paused'
    )) {
      data[key] = value === 1;
    }
    
    // Dates - only fields that END with 'At', 'Date', or are specific date fields
    if (key.toLowerCase().endsWith('at') || 
        key.toLowerCase().endsWith('date') || 
        key === 'timestamp' || 
        key === 'scheduledTime' || 
        key === 'rescheduledTime' ||
        key === 'leaveFrom' ||
        key === 'leaveTo' ||
        key === 'passwordResetExpiry') {
      data[key] = fixDate(value);
    }
    
    // JSON fields
    if (['businessHours', 'holidays', 'departmentIds', 'categoryIds', 'slaConfig', 
         'workingHours', 'metadata', 'config', 'payload'].includes(key)) {
      data[key] = parseJSON(value);
    }
  });
  
  return data;
}

// Rescue Settings
async function rescueSettings() {
  console.log('\n🔧 Rescuing Settings...');
  try {
    const rows = sqlite.prepare('SELECT * FROM Settings').all();
    let rescued = 0;
    let failed = 0;
    
    for (const row of rows) {
      try {
        const data = sanitizeRow(row, 'Settings');
        
        // Settings use 'key' as unique identifier
        // Remove fields that don't exist in Prisma model
        const cleanData = {
          id: data.id,
          key: data.key,
          value: data.value || null,
          description: data.description || null,
          category: data.category || null,
          googleClientId: data.googleClientId || null,
          googleClientSecret: data.googleClientSecret || null,
          isGoogleAuthEnabled: data.isGoogleAuthEnabled || false,
          aiApiKey: data.aiApiKey || null,
          aiProvider: data.aiProvider || null,
          isAiEnabled: data.isAiEnabled || false,
          createdAt: data.createdAt || new Date(),
          updatedAt: data.updatedAt || new Date(),
        };
        
        await prisma.settings.upsert({
          where: { key: cleanData.key },
          update: cleanData,
          create: cleanData
        });
        
        rescued++;
        console.log(`Rescued Setting ID: ${cleanData.id}`);
      } catch (error) {
        failed++;
        console.error(`FAILED Setting ID: ${row.id || row.key} - ${error.message || error.toString() || 'Unknown error'}`);
        console.error(`     Error: ${error.message || error.toString() || 'Unknown error'}`);
        if (error.meta) {
          console.error(`     Meta: ${JSON.stringify(error.meta)}`);
        }
        if (error.stack) {
          console.error(`     Stack: ${error.stack.substring(0, 200)}`);
        }
      }
    }
    
    console.log(`  📊 Settings: ${rescued} rescued, ${failed} failed`);
    return { rescued, failed };
  } catch (error) {
    console.error(`  ❌ Error rescuing Settings:`, error.message || error.toString() || 'Unknown error');
    if (error.stack) {
      console.error(`     Stack: ${error.stack.substring(0, 300)}`);
    }
    return { rescued: 0, failed: 1 };
  }
}

// Rescue Users
async function rescueUsers() {
  console.log('\n🔧 Rescuing Users...');
  try {
    const rows = sqlite.prepare('SELECT * FROM User').all();
    let rescued = 0;
    let failed = 0;
    
    for (const row of rows) {
      try {
        const data = sanitizeRow(row, 'User');
        
        // Fix missing email
        if (!data.email || data.email === 'null' || data.email === '') {
          data.email = generateEmail(data.id, 'user');
        }
        
        // Ensure email is unique
        const existing = await prisma.user.findUnique({ where: { email: data.email } });
        if (existing && existing.id !== data.id) {
          data.email = generateEmail(data.id, 'user');
        }
        
        // Clean data - only include fields that exist in Prisma model
        const cleanData = {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          avatarUrl: data.avatarUrl || null,
          password: data.password || null,
          passwordResetToken: data.passwordResetToken || null,
          passwordResetExpiry: data.passwordResetExpiry ? fixDate(data.passwordResetExpiry) : null,
          status: data.status || 'active',
          type: data.type || 'agent',
          roleId: data.roleId || null,
          createdAt: data.createdAt || new Date(),
          updatedAt: data.updatedAt || new Date(),
        };
        
        await prisma.user.upsert({
          where: { id: cleanData.id },
          update: cleanData,
          create: cleanData
        });
        
        rescued++;
        console.log(`Rescued User ID: ${cleanData.id}`);
      } catch (error) {
        failed++;
        console.error(`FAILED User ID: ${row.id} - ${error.message || error.toString() || 'Unknown error'}`);
      }
    }
    
    console.log(`  📊 Users: ${rescued} rescued, ${failed} failed`);
    return { rescued, failed };
  } catch (error) {
    console.error(`  ❌ Error rescuing Users:`, error.message || error.toString() || 'Unknown error');
    if (error.stack) {
      console.error(`     Stack: ${error.stack.substring(0, 300)}`);
    }
    return { rescued: 0, failed: 1 };
  }
}

// Rescue Agents
async function rescueAgents() {
  console.log('\n🔧 Rescuing Agents...');
  try {
    const rows = sqlite.prepare('SELECT * FROM Agent').all();
    let rescued = 0;
    let failed = 0;
    
    for (const row of rows) {
      try {
        const data = sanitizeRow(row, 'Agent');
        
        // Fix missing email
        if (!data.email || data.email === 'null' || data.email === '') {
          data.email = generateEmail(data.id, 'agent');
        }
        
        // Fix missing slug
        if (!data.slug || data.slug === 'null' || data.slug === '') {
          data.slug = generateSlug(data.name);
        }
        
        // Ensure email is unique
        const existing = await prisma.agent.findUnique({ where: { email: data.email } });
        if (existing && existing.id !== data.id) {
          data.email = generateEmail(data.id, 'agent');
        }
        
        // Ensure slug is unique
        const existingSlug = await prisma.agent.findUnique({ where: { slug: data.slug } });
        if (existingSlug && existingSlug.id !== data.id) {
          data.slug = `${data.slug}-${data.id.substring(0, 8)}`;
        }
        
        // Clean data - only include fields that exist in Prisma model
        const cleanData = {
          id: data.id,
          userId: data.userId || null,
          accountId: data.accountId || null,
          name: data.name,
          email: data.email || null,
          slug: data.slug,
          departmentId: data.departmentId || null,
          roleId: data.roleId || null,
          skills: data.skills || null,
          isActive: data.isActive !== undefined ? data.isActive : true,
          maxLoad: data.maxLoad || null,
          presenceStatus: data.presenceStatus || 'offline',
          lastSeenAt: data.lastSeenAt ? fixDate(data.lastSeenAt) : null,
          status: data.status || 'ACTIVE',
          leaveFrom: data.leaveFrom ? fixDate(data.leaveFrom) : null,
          leaveTo: data.leaveTo ? fixDate(data.leaveTo) : null,
          bio: data.bio || null,
          jobTitle: data.jobTitle || null,
          mobile: data.mobile || null,
          extension: data.extension || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || null,
          postal: data.postal || null,
          timezone: data.timezone || 'Asia/Kolkata',
          language: data.language || 'en',
          createdAt: data.createdAt ? fixDate(data.createdAt) : new Date(),
          updatedAt: data.updatedAt ? fixDate(data.updatedAt) : new Date(),
        };
        
        await prisma.agent.upsert({
          where: { id: cleanData.id },
          update: cleanData,
          create: cleanData
        });
        
        rescued++;
        console.log(`Rescued Agent ID: ${cleanData.id}`);
      } catch (error) {
        failed++;
        console.error(`FAILED Agent ID: ${row.id} - ${error.message || error.toString() || 'Unknown error'}`);
        console.error(`     Error: ${error.message || error.toString() || 'Unknown error'}`);
        if (error.meta) {
          console.error(`     Meta: ${JSON.stringify(error.meta)}`);
        }
        if (error.stack) {
          console.error(`     Stack: ${error.stack.substring(0, 200)}`);
        }
      }
    }
    
    console.log(`  📊 Agents: ${rescued} rescued, ${failed} failed`);
    return { rescued, failed };
  } catch (error) {
    console.error(`  ❌ Error rescuing Agents:`, error.message || error.toString() || 'Unknown error');
    if (error.stack) {
      console.error(`     Stack: ${error.stack.substring(0, 300)}`);
    }
    return { rescued: 0, failed: 1 };
  }
}

// Rescue Customers
async function rescueCustomers() {
  console.log('\n🔧 Rescuing Customers...');
  try {
    const rows = sqlite.prepare('SELECT * FROM Customer').all();
    let rescued = 0;
    let failed = 0;
    
    for (const row of rows) {
      try {
        const data = sanitizeRow(row, 'Customer');
        
        // Fix missing email (if email is required for uniqueness)
        if (data.email && (data.email === 'null' || data.email === '')) {
          data.email = null; // Email is optional for customers
        }
        
        // If email exists, ensure uniqueness
        if (data.email) {
          const existing = await prisma.customer.findUnique({ where: { email: data.email } });
          if (existing && existing.id !== data.id) {
            data.email = generateEmail(data.id, 'customer');
          }
        }
        
        // Clean data
        const cleanData = {
          id: data.id,
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          company: data.company || null,
          location: data.location || null,
          createdAt: data.createdAt ? fixDate(data.createdAt) : new Date(),
          updatedAt: data.updatedAt ? fixDate(data.updatedAt) : new Date(),
        };
        
        await prisma.customer.upsert({
          where: { id: cleanData.id },
          update: cleanData,
          create: cleanData
        });
        
        rescued++;
        console.log(`Rescued Customer ID: ${cleanData.id}`);
      } catch (error) {
        failed++;
        console.error(`FAILED Customer ID: ${row.id} - ${error.message || error.toString() || 'Unknown error'}`);
        console.error(`     Error: ${error.message || error.toString() || 'Unknown error'}`);
        if (error.meta) {
          console.error(`     Meta: ${JSON.stringify(error.meta)}`);
        }
        if (error.stack) {
          console.error(`     Stack: ${error.stack.substring(0, 200)}`);
        }
      }
    }
    
    console.log(`  📊 Customers: ${rescued} rescued, ${failed} failed`);
    return { rescued, failed };
  } catch (error) {
    console.error(`  ❌ Error rescuing Customers:`, error.message || error.toString() || 'Unknown error');
    if (error.stack) {
      console.error(`     Stack: ${error.stack.substring(0, 300)}`);
    }
    return { rescued: 0, failed: 1 };
  }
}

// Rescue Departments
async function rescueDepartments() {
  console.log('\n🔧 Rescuing Departments...');
  try {
    const rows = sqlite.prepare('SELECT * FROM Department').all();
    let rescued = 0;
    let failed = 0;
    const nameMap = new Map(); // Track names to handle duplicates
    
    for (const row of rows) {
      try {
        const data = sanitizeRow(row, 'Department');
        
        // Fix missing or empty name (required and unique)
        if (!data.name || data.name === 'null' || data.name.trim() === '') {
          data.name = `Department-${data.id.substring(0, 8)}`;
        }
        
        // Handle duplicate names (name must be unique)
        let finalName = data.name;
        if (nameMap.has(finalName)) {
          // Name already used, append ID suffix
          finalName = `${data.name}-${data.id.substring(0, 8)}`;
        }
        nameMap.set(finalName, data.id);
        
        // Validate departmentHeadId exists (if provided)
        let departmentHeadId = data.departmentHeadId || null;
        if (departmentHeadId) {
          try {
            const agentExists = await prisma.agent.findUnique({
              where: { id: departmentHeadId },
              select: { id: true }
            });
            if (!agentExists) {
              console.log(`     Warning: departmentHeadId ${departmentHeadId} does not exist, setting to null`);
              departmentHeadId = null;
            }
          } catch (checkError) {
            console.log(`     Warning: Could not validate departmentHeadId ${departmentHeadId}, setting to null`);
            departmentHeadId = null;
          }
        }
        
        // Check if department already exists
        const existing = await prisma.department.findUnique({
          where: { id: data.id }
        });
        
        // Clean data
        const cleanData = {
          id: data.id,
          name: finalName,
          description: data.description || null,
          isActive: data.isActive !== undefined ? data.isActive : true,
          departmentHeadId: departmentHeadId,
          slaConfig: data.slaConfig ? (typeof data.slaConfig === 'string' ? data.slaConfig : JSON.stringify(data.slaConfig)) : null,
          workingHours: data.workingHours ? (typeof data.workingHours === 'string' ? data.workingHours : JSON.stringify(data.workingHours)) : null,
          holidays: data.holidays ? (typeof data.holidays === 'string' ? data.holidays : JSON.stringify(data.holidays)) : null,
          createdAt: data.createdAt ? fixDate(data.createdAt) : new Date(),
          updatedAt: data.updatedAt ? fixDate(data.updatedAt) : new Date(),
        };
        
        // Try normal upsert first
        try {
          await prisma.department.upsert({
            where: { id: cleanData.id },
            update: cleanData,
            create: cleanData
          });
        } catch (upsertError) {
          // If upsert fails with relation error (P2014), try raw SQL insert
          console.log(`     Upsert failed with code: ${upsertError.code}, existing=${!!existing}`);
          if (upsertError.code === 'P2014') {
            try {
              console.log(`     Attempting raw SQL insert for department ${cleanData.id}...`);
              // Temporarily disable foreign key checks to allow inserting departments that agents reference
              await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=0');
              
              // Use raw SQL to bypass Prisma relation checks
              const tableName = 'Department'; // Adjust if your MySQL table is lowercase
              await prisma.$executeRawUnsafe(`
                INSERT INTO \`${tableName}\` (id, name, description, isActive, departmentHeadId, slaConfig, workingHours, holidays, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  name = VALUES(name),
                  description = VALUES(description),
                  isActive = VALUES(isActive),
                  departmentHeadId = VALUES(departmentHeadId),
                  slaConfig = VALUES(slaConfig),
                  workingHours = VALUES(workingHours),
                  holidays = VALUES(holidays),
                  updatedAt = VALUES(updatedAt)
              `, 
                cleanData.id,
                cleanData.name,
                cleanData.description,
                cleanData.isActive,
                cleanData.departmentHeadId,
                cleanData.slaConfig,
                cleanData.workingHours,
                cleanData.holidays,
                cleanData.createdAt,
                cleanData.updatedAt
              );
              
              // Re-enable foreign key checks
              await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=1');
              
              console.log(`     ✅ Inserted via raw SQL with FK checks disabled`);
              rescued++;
              console.log(`Rescued Department ID: ${cleanData.id} (name: ${finalName})`);
              continue; // Skip to next department
            } catch (rawError) {
              // Re-enable foreign key checks even on error
              try {
                await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=1');
              } catch (e) {}
              
              console.error(`     Raw SQL also failed: ${rawError.message}`);
              // If raw SQL also fails, rethrow original error
              throw upsertError;
            }
          } else {
            // Rethrow if it's not a relation error
            throw upsertError;
          }
        }
      } catch (error) {
        failed++;
        const errorMsg = error.message || error.toString() || 'Unknown error';
        const errorCode = error.code || 'NO_CODE';
        console.error(`FAILED Department ID: ${row.id} - ${errorMsg}`);
        console.error(`     Error Code: ${errorCode}`);
        console.error(`     Department Name: ${row.name || 'MISSING'}`);
        if (error.meta) {
          console.error(`     Meta: ${JSON.stringify(error.meta)}`);
        }
        if (error.stack) {
          console.error(`     Stack: ${error.stack.substring(0, 300)}`);
        }
        // Log full error for debugging
        console.error(`     Full Error:`, JSON.stringify(error, Object.getOwnPropertyNames(error)));
      }
    }
    
    console.log(`  📊 Departments: ${rescued} rescued, ${failed} failed`);
    return { rescued, failed };
  } catch (error) {
    console.error(`  ❌ Error rescuing Departments:`, error.message || error.toString() || 'Unknown error');
    if (error.stack) {
      console.error(`     Stack: ${error.stack.substring(0, 300)}`);
    }
    return { rescued: 0, failed: 1 };
  }
}

// Rescue SLAPolicy
async function rescueSLAPolicy() {
  console.log('\n🔧 Rescuing SLAPolicy...');
  try {
    const rows = sqlite.prepare('SELECT * FROM SLAPolicy').all();
    let rescued = 0;
    let failed = 0;
    
    for (const row of rows) {
      try {
        const data = sanitizeRow(row, 'SLAPolicy');
        
        // Ensure businessHours is properly parsed (if it's a string in SQLite, parse it)
        if (data.businessHours) {
          if (typeof data.businessHours === 'string') {
            try {
              data.businessHours = JSON.parse(data.businessHours);
            } catch (e) {
              // If parsing fails, keep as string or set to null
              data.businessHours = null;
            }
          }
        }
        
        // Ensure holidays is properly parsed
        if (data.holidays && typeof data.holidays === 'string') {
          data.holidays = parseJSON(data.holidays);
        }
        
        // Ensure departmentIds and categoryIds are parsed
        if (data.departmentIds && typeof data.departmentIds === 'string') {
          data.departmentIds = parseJSON(data.departmentIds);
        }
        if (data.categoryIds && typeof data.categoryIds === 'string') {
          data.categoryIds = parseJSON(data.categoryIds);
        }
        
        // Fix boolean fields that might be integers (1/0) from SQLite
        const fixBoolean = (value, defaultValue = true) => {
          if (value === undefined || value === null) return defaultValue;
          if (typeof value === 'boolean') return value;
          if (typeof value === 'number') return value === 1;
          if (typeof value === 'string') return value === 'true' || value === '1';
          return defaultValue;
        };
        
        // Clean data - ensure JSON fields are strings for @db.Text
        const cleanData = {
          id: data.id,
          name: data.name,
          description: data.description || null,
          isDefault: fixBoolean(data.isDefault, false),
          isActive: fixBoolean(data.isActive, true),
          lowResponseTime: data.lowResponseTime || null,
          lowResolutionTime: data.lowResolutionTime || null,
          mediumResponseTime: data.mediumResponseTime || null,
          mediumResolutionTime: data.mediumResolutionTime || null,
          highResponseTime: data.highResponseTime || null,
          highResolutionTime: data.highResolutionTime || null,
          urgentResponseTime: data.urgentResponseTime || null,
          urgentResolutionTime: data.urgentResolutionTime || null,
          useBusinessHours: fixBoolean(data.useBusinessHours, true),
          businessHours: data.businessHours ? (typeof data.businessHours === 'string' ? data.businessHours : JSON.stringify(data.businessHours)) : null,
          timezone: data.timezone || 'UTC',
          holidays: data.holidays ? (typeof data.holidays === 'string' ? data.holidays : JSON.stringify(data.holidays)) : null,
          escalationLevel1: data.escalationLevel1 || 80,
          escalationLevel2: data.escalationLevel2 || 95,
          pauseOnWaiting: fixBoolean(data.pauseOnWaiting, true),
          pauseOnHold: fixBoolean(data.pauseOnHold, true),
          pauseOffHours: fixBoolean(data.pauseOffHours, true),
          departmentIds: data.departmentIds ? (typeof data.departmentIds === 'string' ? data.departmentIds : JSON.stringify(data.departmentIds)) : null,
          categoryIds: data.categoryIds ? (typeof data.categoryIds === 'string' ? data.categoryIds : JSON.stringify(data.categoryIds)) : null,
          createdAt: data.createdAt ? fixDate(data.createdAt) : new Date(),
          updatedAt: data.updatedAt ? fixDate(data.updatedAt) : new Date(),
        };
        
        await prisma.sLAPolicy.upsert({
          where: { id: cleanData.id },
          update: cleanData,
          create: cleanData
        });
        
        rescued++;
        console.log(`Rescued SLAPolicy ID: ${cleanData.id}`);
      } catch (error) {
        failed++;
        console.error(`FAILED SLAPolicy ID: ${row.id} - ${error.message || error.toString() || 'Unknown error'}`);
        console.error(`     Error: ${error.message || error.toString() || 'Unknown error'}`);
        if (error.meta) {
          console.error(`     Meta: ${JSON.stringify(error.meta)}`);
        }
        if (error.stack) {
          console.error(`     Stack: ${error.stack.substring(0, 200)}`);
        }
      }
    }
    
    console.log(`  📊 SLAPolicy: ${rescued} rescued, ${failed} failed`);
    return { rescued, failed };
  } catch (error) {
    console.error(`  ❌ Error rescuing SLAPolicy:`, error.message || error.toString() || 'Unknown error');
    if (error.stack) {
      console.error(`     Stack: ${error.stack.substring(0, 300)}`);
    }
    return { rescued: 0, failed: 1 };
  }
}

// Rescue Notifications
async function rescueNotifications() {
  console.log('\n🔧 Rescuing Notifications...');
  try {
    const rows = sqlite.prepare('SELECT * FROM Notification').all();
    let rescued = 0;
    let failed = 0;
    
    for (const row of rows) {
      try {
        const data = sanitizeRow(row, 'Notification');
        
        // Force fix all dates - use current date if invalid (strict mode for year validation)
        if (data.createdAt) {
          const fixedDate = fixDate(data.createdAt, true); // strict mode: check year > 3000 or < 1970
          data.createdAt = fixedDate;
        } else {
          data.createdAt = new Date();
        }
        if (data.updatedAt) data.updatedAt = fixDate(data.updatedAt, true);
        if (data.readAt) data.readAt = fixDate(data.readAt, true);
        
        // Fix metadata - ensure it's string or null
        if (data.metadata && typeof data.metadata !== 'string') {
          if (data.metadata instanceof Date) {
            data.metadata = null; // Invalid Date object
          } else {
            data.metadata = JSON.stringify(data.metadata);
          }
        }
        
        await prisma.notification.upsert({
          where: { id: data.id },
          update: data,
          create: data
        });
        
        rescued++;
        console.log(`Rescued Notification ID: ${data.id}`);
      } catch (error) {
        failed++;
        const errorMsg = error.message || error.toString() || 'Unknown error';
        console.error(`FAILED Notification ID: ${row.id} - ${errorMsg}`);
        if (error.meta) {
          console.error(`     Meta: ${JSON.stringify(error.meta)}`);
        }
        if (error.stack) {
          console.error(`     Stack: ${error.stack.substring(0, 200)}`);
        }
      }
    }
    
    console.log(`  📊 Notifications: ${rescued} rescued, ${failed} failed`);
    return { rescued, failed };
  } catch (error) {
    console.error(`  ❌ Error rescuing Notifications:`, error.message || error.toString() || 'Unknown error');
    if (error.stack) {
      console.error(`     Stack: ${error.stack.substring(0, 300)}`);
    }
    return { rescued: 0, failed: 1 };
  }
}

// Rescue Articles
async function rescueArticles() {
  console.log('\n🔧 Rescuing Articles...');
  try {
    const rows = sqlite.prepare('SELECT * FROM Article').all();
    let rescued = 0;
    let failed = 0;
    
    for (const row of rows) {
      try {
        const data = sanitizeRow(row, 'Article');
        
        // Fix missing slug
        if (!data.slug || data.slug === 'null' || data.slug === '') {
          data.slug = generateSlug(data.title);
        }
        
        // Ensure slug is unique
        const existing = await prisma.article.findUnique({ where: { slug: data.slug } });
        if (existing && existing.id !== data.id) {
          data.slug = `${data.slug}-${data.id.substring(0, 8)}`;
        }
        
        // Parse tags if it's a string
        if (data.tags && typeof data.tags === 'string') {
          data.tags = parseJSON(data.tags);
        }
        
        // Clean data
        const cleanData = {
          id: data.id,
          title: data.title,
          content: data.content || '',
          slug: data.slug,
          contentType: data.contentType || 'richtext',
          categoryId: data.categoryId || null,
          status: data.status || 'draft',
          tags: data.tags ? (typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags)) : null,
          isPublic: data.isPublic !== undefined ? data.isPublic : true,
          views: data.views || 0,
          helpfulVotes: data.helpfulVotes || 0,
          createdById: data.createdById || null,
          createdByName: data.createdByName || null,
          updatedById: data.updatedById || null,
          updatedByName: data.updatedByName || null,
          createdAt: data.createdAt ? fixDate(data.createdAt) : new Date(),
          updatedAt: data.updatedAt ? fixDate(data.updatedAt) : new Date(),
        };
        
        await prisma.article.upsert({
          where: { id: cleanData.id },
          update: cleanData,
          create: cleanData
        });
        
        rescued++;
        console.log(`Rescued Article ID: ${cleanData.id}`);
      } catch (error) {
        failed++;
        console.error(`FAILED Article ID: ${row.id} - ${error.message || error.toString() || 'Unknown error'}`);
      }
    }
    
    console.log(`  📊 Articles: ${rescued} rescued, ${failed} failed`);
    return { rescued, failed };
  } catch (error) {
    console.error(`  ❌ Error rescuing Articles:`, error.message || error.toString() || 'Unknown error');
    if (error.stack) {
      console.error(`     Stack: ${error.stack.substring(0, 300)}`);
    }
    return { rescued: 0, failed: 1 };
  }
}

// Rescue ArticleCategory
async function rescueArticleCategory() {
  console.log('\n🔧 Rescuing ArticleCategory...');
  try {
    const rows = sqlite.prepare('SELECT * FROM ArticleCategory').all();
    let rescued = 0;
    let failed = 0;
    
    for (const row of rows) {
      try {
        const data = sanitizeRow(row, 'ArticleCategory');
        
        // Fix missing slug
        if (!data.slug || data.slug === 'null' || data.slug === '') {
          data.slug = generateSlug(data.name);
        }
        
        // Ensure slug is unique
        const existingSlug = await prisma.articleCategory.findUnique({ where: { slug: data.slug } });
        if (existingSlug && existingSlug.id !== data.id) {
          data.slug = `${data.slug}-${data.id.substring(0, 8)}`;
        }
        
        // Validate parentId exists (if provided)
        let parentId = data.parentId || null;
        if (parentId) {
          try {
            const parentExists = await prisma.articleCategory.findUnique({
              where: { id: parentId },
              select: { id: true }
            });
            if (!parentExists) {
              console.log(`     Warning: parentId ${parentId} does not exist yet, setting to null`);
              parentId = null;
            }
          } catch (checkError) {
            console.log(`     Warning: Could not validate parentId ${parentId}, setting to null`);
            parentId = null;
          }
        }
        
        // Check if category already exists
        const existing = await prisma.articleCategory.findUnique({
          where: { id: data.id }
        });
        
        // Clean data
        const cleanData = {
          id: data.id,
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          parentId: parentId,
          order: data.order || 0,
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdAt: data.createdAt ? fixDate(data.createdAt) : new Date(),
          updatedAt: data.updatedAt ? fixDate(data.updatedAt) : new Date(),
        };
        
        // Try normal upsert first
        try {
          await prisma.articleCategory.upsert({
            where: { id: cleanData.id },
            update: cleanData,
            create: cleanData
          });
        } catch (upsertError) {
          // If upsert fails with relation error (P2014), try raw SQL insert
          console.log(`     Upsert failed with code: ${upsertError.code}, existing=${!!existing}`);
          if (upsertError.code === 'P2014') {
            try {
              console.log(`     Attempting raw SQL insert for category ${cleanData.id}...`);
              // Temporarily disable foreign key checks
              await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=0');
              
              // Use raw SQL to bypass Prisma relation checks
              await prisma.$executeRawUnsafe(`
                INSERT INTO \`ArticleCategory\` (id, name, slug, description, parentId, \`order\`, isActive, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  name = VALUES(name),
                  slug = VALUES(slug),
                  description = VALUES(description),
                  parentId = VALUES(parentId),
                  \`order\` = VALUES(\`order\`),
                  isActive = VALUES(isActive),
                  updatedAt = VALUES(updatedAt)
              `, 
                cleanData.id,
                cleanData.name,
                cleanData.slug,
                cleanData.description,
                cleanData.parentId,
                cleanData.order,
                cleanData.isActive,
                cleanData.createdAt,
                cleanData.updatedAt
              );
              
              // Re-enable foreign key checks
              await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=1');
              
              console.log(`     ✅ Inserted via raw SQL with FK checks disabled`);
              rescued++;
              console.log(`Rescued ArticleCategory ID: ${cleanData.id}`);
              continue; // Skip to next category
            } catch (rawError) {
              // Re-enable foreign key checks even on error
              try {
                await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=1');
              } catch (e) {}
              
              console.error(`     Raw SQL also failed: ${rawError.message}`);
              // If raw SQL also fails, rethrow original error
              throw upsertError;
            }
          } else {
            // Rethrow if it's not a relation error
            throw upsertError;
          }
        }
        
        rescued++;
        console.log(`Rescued ArticleCategory ID: ${cleanData.id}`);
      } catch (error) {
        failed++;
        console.error(`FAILED ArticleCategory ID: ${row.id} - ${error.message || error.toString() || 'Unknown error'}`);
      }
    }
    
    console.log(`  📊 ArticleCategory: ${rescued} rescued, ${failed} failed`);
    return { rescued, failed };
  } catch (error) {
    console.error(`  ❌ Error rescuing ArticleCategory:`, error.message || error.toString() || 'Unknown error');
    if (error.stack) {
      console.error(`     Stack: ${error.stack.substring(0, 300)}`);
    }
    return { rescued: 0, failed: 1 };
  }
}

// Main rescue function
async function rescue() {
  console.log('🚨 UNIVERSAL RESCUE SCRIPT - Force Migrating Problematic Records\n');
  console.log('='.repeat(60));
  
  try {
    // Test connections
    console.log('🔌 Testing connections...');
    if (!sqlite.open) {
      throw new Error('SQLite database not accessible');
    }
    await prisma.$connect();
    console.log('✅ Connected to SQLite and MySQL\n');
    
    const results = {
      Settings: { rescued: 0, failed: 0 },
      Departments: { rescued: 0, failed: 0 },
      Users: { rescued: 0, failed: 0 },
      Agents: { rescued: 0, failed: 0 },
      Customers: { rescued: 0, failed: 0 },
      SLAPolicy: { rescued: 0, failed: 0 },
      Articles: { rescued: 0, failed: 0 },
      ArticleCategory: { rescued: 0, failed: 0 },
      Notifications: { rescued: 0, failed: 0 },
    };
    
    // Rescue in priority order:
    // First: Settings, Department (must exist before Agents/Users)
    console.log('\n📋 Priority 1: Foundation tables (Settings, Department)');
    results.Settings = await rescueSettings();
    results.Departments = await rescueDepartments();
    
    // Second: User, Agent, Customer
    console.log('\n📋 Priority 2: Core entities (User, Agent, Customer)');
    results.Users = await rescueUsers();
    results.Agents = await rescueAgents();
    results.Customers = await rescueCustomers();
    
    // Third: SLAPolicy, Article, ArticleCategory
    console.log('\n📋 Priority 3: Configuration & Content (SLAPolicy, Article, ArticleCategory)');
    results.SLAPolicy = await rescueSLAPolicy();
    results.Articles = await rescueArticles();
    results.ArticleCategory = await rescueArticleCategory();
    
    // Fourth: Notification (most errors)
    console.log('\n📋 Priority 4: Notifications (most problematic)');
    results.Notifications = await rescueNotifications();
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESCUE SUMMARY');
    console.log('='.repeat(60));
    
    let totalRescued = 0;
    let totalFailed = 0;
    
    Object.entries(results).forEach(([table, stats]) => {
      const status = stats.failed > 0 ? '⚠️' : '✅';
      console.log(`  ${status} ${table}: ${stats.rescued} rescued, ${stats.failed} failed`);
      totalRescued += stats.rescued;
      totalFailed += stats.failed;
    });
    
    console.log('='.repeat(60));
    console.log(`✅ Total Rescued: ${totalRescued} records`);
    if (totalFailed > 0) {
      console.log(`⚠️  Total Failed: ${totalFailed} records`);
    }
    console.log('\n🎉 Rescue operation complete!\n');
    
  } catch (error) {
    console.error('\n❌ Rescue failed:');
    console.error(`   Error: ${error.message || error.toString() || 'Unknown error'}`);
    if (error.meta) {
      console.error(`   Meta: ${JSON.stringify(error.meta)}`);
    }
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    console.error(`   Full error object:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    sqlite.close();
    console.log('🔌 Connections closed');
  }
}

// Run rescue
rescue().catch(error => {
  console.error('Fatal error:');
  console.error(`   Error: ${error.message || error.toString() || 'Unknown error'}`);
  if (error.meta) {
    console.error(`   Meta: ${JSON.stringify(error.meta)}`);
  }
  if (error.stack) {
    console.error(`   Stack: ${error.stack}`);
  }
  console.error(`   Full error object:`, error);
  process.exit(1);
});

