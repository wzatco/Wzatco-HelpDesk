/**
 * Check admin user in database
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    console.log('🔍 Checking admin user...\n');
    
    const adminEmail = 'admin@wzatco.com';
    
    // Check if admin exists
    const admin = await prisma.admin.findUnique({
      where: { email: adminEmail }
    });
    
    if (!admin) {
      console.log('❌ Admin not found!');
      console.log('📝 Creating admin user...\n');
      
      const password = 'Wzatco#1234';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newAdmin = await prisma.admin.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Admin',
        }
      });
      
      console.log('✅ Admin created successfully!');
      console.log(`📧 Email: ${newAdmin.email}`);
      console.log(`👤 Name: ${newAdmin.name}`);
      console.log(`🆔 ID: ${newAdmin.id}\n`);
    } else {
      console.log('✅ Admin found!');
      console.log(`📧 Email: ${admin.email}`);
      console.log(`👤 Name: ${admin.name}`);
      console.log(`🆔 ID: ${admin.id}`);
      console.log(`🔑 Has Password: ${admin.password ? 'Yes' : 'No'}\n`);
      
      // Test password
      const testPassword = 'Wzatco#1234';
      if (admin.password) {
        const isValid = await bcrypt.compare(testPassword, admin.password);
        console.log(`🔐 Password Test: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
        
        if (!isValid) {
          console.log('\n🔄 Updating password...');
          const hashedPassword = await bcrypt.hash(testPassword, 10);
          await prisma.admin.update({
            where: { email: adminEmail },
            data: { password: hashedPassword }
          });
          console.log('✅ Password updated!');
        }
      } else {
        console.log('⚠️  No password set, creating one...');
        const hashedPassword = await bcrypt.hash(testPassword, 10);
        await prisma.admin.update({
          where: { email: adminEmail },
          data: { password: hashedPassword }
        });
        console.log('✅ Password set!');
      }
    }
    
    console.log('\n📋 Login Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: Wzatco#1234\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();

