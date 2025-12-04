/**
 * Clean database - Delete all records except workflows
 * Update admin credentials
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function cleanDatabase() {
  try {
    console.log('🧹 Cleaning database (keeping workflows)...\n');
    
    // Delete in reverse dependency order to avoid foreign key violations
    const deleteOrder = [
      'worklog',
      'sLAEscalation',
      'sLABreach',
      'sLATimer',
      'conversation',
      'ticketTemplate',
      'escalationRule',
      'agent',
      'customer',
      'product',
      'rolePermission',
      'user',
      'role',
      'department',
      'settings',
      'sLAPolicy', // Keep workflows, but can delete policies if needed
    ];

    for (const modelName of deleteOrder) {
      try {
        if (prisma[modelName]) {
          const count = await prisma[modelName].count();
          if (count > 0) {
            await prisma[modelName].deleteMany({});
            console.log(`✅ Deleted ${count} records from ${modelName}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error deleting ${modelName}:`, error.message);
      }
    }

    console.log('\n✅ Database cleaned!\n');
    
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    throw error;
  }
}

async function createAdmin() {
  try {
    console.log('👤 Creating/Updating admin user...\n');
    
    const adminEmail = 'admin@wzatco.com';
    const adminPassword = 'Wzatco#1234';
    
    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Check if admin exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: adminEmail }
    });
    
    if (existingAdmin) {
      // Update existing admin
      await prisma.admin.update({
        where: { email: adminEmail },
        data: {
          password: hashedPassword,
          name: 'Admin',
        }
      });
      console.log('✅ Admin credentials updated');
    } else {
      // Create new admin
      await prisma.admin.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Admin',
        }
      });
      console.log('✅ Admin user created');
    }
    
    console.log(`\n📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}\n`);
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    throw error;
  }
}

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to database\n');
    
    // Clean database
    await cleanDatabase();
    
    // Create/update admin
    await createAdmin();
    
    console.log('✅ All done!');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

