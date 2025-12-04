// Load environment variables
const dotenv = require('dotenv');
const path = require('path');
const result = dotenv.config({ path: path.join(__dirname, '.env') });

if (result.error) {
  console.error('⚠️  Error loading .env file:', result.error);
}

// Fallback: set directly if not loaded
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_iFHl5j3WPyQC@ep-crimson-base-ad14rm9i-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
  console.log('📝 Using hardcoded DATABASE_URL');
}

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  try {
    console.log('🔌 Testing Neon Database Connection...\n');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Successfully connected to Neon database!\n');
    
    // Test query - simple SELECT to verify connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('📊 Test Query Result:', result);
    
    // Try to get database info
    try {
      const dbInfo = await prisma.$queryRaw`SELECT current_database() as db_name, version() as db_version`;
      console.log('📊 Database Info:', dbInfo[0]);
    } catch (e) {
      // Some databases might not support version()
      console.log('📊 Database connected (version query not available)');
    }
    
    console.log('\n✅ Connection test passed!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. DATABASE_URL is set in your .env file');
    console.error('   2. Your Neon database is accessible');
    console.error('   3. IP address is whitelisted (if required)');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

