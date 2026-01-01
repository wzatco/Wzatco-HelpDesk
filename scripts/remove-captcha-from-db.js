// Script to remove all captcha-related settings from the database
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeCaptchaFromDatabase() {
  try {
    console.log('🗑️  Removing captcha settings from database...\n');
    
    // Find all captcha-related settings
    // Check by category
    const captchaByCategory = await prisma.settings.findMany({
      where: {
        category: 'captcha'
      }
    });
    
    // Check by key (common captcha keys)
    const captchaKeys = [
      'captcha_enabled',
      'captcha_admin_login',
      'captcha_agent_login',
      'captcha_ticket_creation',
      'captcha_placement',
      'captcha_type',
      'captcha_difficulty',
      'captcha_length',
      'captcha_theme',
      'captcha_response',
      'captcha_data'
    ];
    
    const captchaByKey = await prisma.settings.findMany({
      where: {
        key: {
          in: captchaKeys
        }
      }
    });
    
    // Combine and deduplicate
    const allCaptchaSettings = [...captchaByCategory, ...captchaByKey];
    const uniqueSettings = Array.from(
      new Map(allCaptchaSettings.map(s => [s.id, s])).values()
    );
    
    if (uniqueSettings.length === 0) {
      console.log('✅ No captcha settings found in database.');
      return;
    }
    
    console.log(`Found ${uniqueSettings.length} captcha setting(s):`);
    uniqueSettings.forEach(setting => {
      console.log(`  - ${setting.key} (category: ${setting.category || 'N/A'})`);
    });
    
    // Delete all captcha settings
    const deleteByCategory = await prisma.settings.deleteMany({
      where: {
        category: 'captcha'
      }
    });
    
    const deleteByKey = await prisma.settings.deleteMany({
      where: {
        key: {
          in: captchaKeys
        }
      }
    });
    
    console.log(`\n✅ Successfully removed captcha settings from database.`);
    console.log(`   - Deleted ${deleteByCategory.count} setting(s) by category`);
    console.log(`   - Deleted ${deleteByKey.count} setting(s) by key`);
    
  } catch (error) {
    console.error('❌ Error removing captcha settings:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

removeCaptchaFromDatabase();

