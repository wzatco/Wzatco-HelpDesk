/**
 * Script to create default admin user
 * Email: admin@wzatco.com
 * Password: Rohan#1025
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔐 Creating admin user...');

    const email = 'admin@wzatco.com';
    const password = 'Rohan#1025';
    const name = 'Admin';

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✓ Password hashed');

    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email }
    });

    let admin;
    if (existingAdmin) {
      console.log('⚠️  Admin already exists, updating password...');
      admin = await prisma.admin.update({
        where: { email },
        data: {
          password: hashedPassword,
          name: name
        }
      });
      console.log('✓ Admin password updated');
    } else {
      // Create new admin
      admin = await prisma.admin.create({
        data: {
          name: name,
          email: email,
          password: hashedPassword,
          role: 'Super Admin'
        }
      });
      console.log('✓ Admin created');
    }

    // Check if user record exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    // Find or create Super Admin role
    let superAdminRole = await prisma.role.findFirst({
      where: { hasSuperPower: true }
    });

    if (!superAdminRole) {
      console.log('⚠️  No Super Admin role found, creating one...');
      superAdminRole = await prisma.role.create({
        data: {
          title: 'Super Admin',
          displayAs: 'Super Admin',
          hasSuperPower: true
        }
      });
      console.log('✓ Super Admin role created');
    }

    let user;
    if (existingUser) {
      console.log('⚠️  User already exists, updating role...');
      user = await prisma.user.update({
        where: { email },
        data: {
          name: name,
          roleId: superAdminRole.id,
          type: 'admin',
          status: 'active'
        }
      });
      console.log('✓ User updated');
    } else {
      // Create user record
      user = await prisma.user.create({
        data: {
          name: name,
          email: email,
          roleId: superAdminRole.id,
          type: 'admin',
          status: 'active'
        }
      });
      console.log('✓ User created');
    }

    console.log('\n✅ Admin user setup complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('👤 Name:', name);
    console.log('🛡️  Role:', superAdminRole.title);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🌐 You can now login at: http://localhost:3000/admin/login\n');

  } catch (error) {
    console.error('❌ Error creating admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

