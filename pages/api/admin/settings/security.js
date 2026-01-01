import { PrismaClient } from '@prisma/client';

// Prisma singleton pattern
let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

const SETTINGS_KEYS = {
  ADMIN_LOGIN_SECURITY: 'security_admin_login',
  ACCOUNT_LOCK_ENABLED: 'security_account_lock_enabled',
  ACCOUNT_LOCK_ATTEMPTS: 'security_account_lock_attempts',
  ACCOUNT_LOCK_MINUTES: 'security_account_lock_minutes',
  DOS_PROTECTION: 'security_dos_protection',
  SPAM_EMAIL_BLOCKLIST: 'security_spam_email_blocklist'
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Get all security settings
      const settings = await prisma.settings.findMany({
        where: {
          category: 'security'
        }
      });

      // Convert to key-value object
      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });

      // Parse spam email blocklist if stored as JSON
      let spamEmailBlocklist = [];
      try {
        if (settingsObj[SETTINGS_KEYS.SPAM_EMAIL_BLOCKLIST]) {
          spamEmailBlocklist = JSON.parse(settingsObj[SETTINGS_KEYS.SPAM_EMAIL_BLOCKLIST]);
        }
      } catch (e) {
        console.error('Error parsing spam email blocklist:', e);
      }

      // Return with defaults if not set
      const result = {
        adminLoginSecurity: settingsObj[SETTINGS_KEYS.ADMIN_LOGIN_SECURITY] === 'true' || true, // Default to true
        accountLockEnabled: settingsObj[SETTINGS_KEYS.ACCOUNT_LOCK_ENABLED] === 'true' || true, // Default to true
        accountLockAttempts: settingsObj[SETTINGS_KEYS.ACCOUNT_LOCK_ATTEMPTS] || '5',
        accountLockMinutes: settingsObj[SETTINGS_KEYS.ACCOUNT_LOCK_MINUTES] || '15',
        dosProtection: settingsObj[SETTINGS_KEYS.DOS_PROTECTION] === 'true' || true, // Default to true
        spamEmailBlocklist: spamEmailBlocklist.length > 0 ? spamEmailBlocklist : []
      };

      res.status(200).json({ success: true, settings: result });
    } catch (error) {
      console.error('Error fetching security settings:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  } else if (req.method === 'PATCH') {
    try {
      const {
        adminLoginSecurity,
        accountLockEnabled,
        accountLockAttempts,
        accountLockMinutes,
        dosProtection,
        spamEmailBlocklist
      } = req.body;

      // Update or create each setting
      const updateSetting = async (key, value, description) => {
        await prisma.settings.upsert({
          where: { key },
          update: { 
            value: value.toString(),
            updatedAt: new Date()
          },
          create: {
            key,
            value: value.toString(),
            description,
            category: 'security'
          }
        });
      };

      if (adminLoginSecurity !== undefined) {
        await updateSetting(
          SETTINGS_KEYS.ADMIN_LOGIN_SECURITY,
          adminLoginSecurity,
          'Enable or disable admin login security features'
        );
      }

      if (accountLockEnabled !== undefined) {
        await updateSetting(
          SETTINGS_KEYS.ACCOUNT_LOCK_ENABLED,
          accountLockEnabled,
          'Enable temporary account lock after failed login attempts'
        );
      }

      if (accountLockAttempts !== undefined) {
        await updateSetting(
          SETTINGS_KEYS.ACCOUNT_LOCK_ATTEMPTS,
          accountLockAttempts,
          'Number of failed login attempts before account lock'
        );
      }

      if (accountLockMinutes !== undefined) {
        await updateSetting(
          SETTINGS_KEYS.ACCOUNT_LOCK_MINUTES,
          accountLockMinutes,
          'Number of minutes to lock account after failed attempts'
        );
      }

      if (dosProtection !== undefined) {
        await updateSetting(
          SETTINGS_KEYS.DOS_PROTECTION,
          dosProtection,
          'Enable DoS attack protection'
        );
      }

      if (spamEmailBlocklist !== undefined) {
        const blocklistJson = JSON.stringify(Array.isArray(spamEmailBlocklist) ? spamEmailBlocklist : []);
        await updateSetting(
          SETTINGS_KEYS.SPAM_EMAIL_BLOCKLIST,
          blocklistJson,
          'List of blocked email addresses/domains (stored as JSON array)'
        );
      }

      res.status(200).json({ success: true, message: 'Security settings saved successfully' });
    } catch (error) {
      console.error('Error updating security settings:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

