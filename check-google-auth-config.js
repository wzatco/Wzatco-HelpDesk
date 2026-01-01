// Check Google OAuth Configuration
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGoogleAuth() {
  try {
    console.log('\n=== Google OAuth Configuration Check ===\n');
    
    // Check database settings
    const settings = await prisma.settings.findFirst({
      where: { category: 'integrations' }
    });

    if (settings) {
      console.log('✅ Integration settings found');
      console.log('📝 Google Auth Enabled:', settings.isGoogleAuthEnabled || false);
      console.log('🔑 Has Client ID:', !!settings.googleClientId);
      console.log('🔐 Has Client Secret:', !!settings.googleClientSecret);
      
      if (settings.googleClientId) {
        console.log('📧 Client ID Preview:', settings.googleClientId.substring(0, 20) + '...');
      }
    } else {
      console.log('⚠️  No integration settings found in database');
      console.log('💡 Configure in Admin → Settings → External Integrations');
    }

    // Check environment variables fallback
    console.log('\n--- Environment Variables Fallback ---');
    console.log('🔑 GOOGLE_CLIENT_ID:', !!process.env.GOOGLE_CLIENT_ID);
    console.log('🔐 GOOGLE_CLIENT_SECRET:', !!process.env.GOOGLE_CLIENT_SECRET);

    if (!settings && !process.env.GOOGLE_CLIENT_ID) {
      console.log('\n❌ Google OAuth not configured!');
      console.log('\nTo fix:');
      console.log('1. Go to Admin → Settings → External Integrations');
      console.log('2. Enable Google Authentication');
      console.log('3. Enter Google Client ID and Secret');
      console.log('4. Save settings');
    } else {
      console.log('\n✅ Google OAuth is configured and ready!');
    }

    // Check recent customers
    console.log('\n--- Recent Customers ---');
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });

    if (customers.length > 0) {
      console.log(`Found ${customers.length} recent customers:`);
      customers.forEach(c => {
        console.log(`  • ${c.name} (${c.email}) - ${c.createdAt.toLocaleString()}`);
      });
    } else {
      console.log('No customers found yet');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkGoogleAuth();
