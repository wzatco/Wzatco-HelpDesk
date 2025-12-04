/**
 * Update admin credentials
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updateAdmin() {
  try {
    console.log('👤 Updating admin credentials...\n');
    
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
    console.log('✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdmin();

