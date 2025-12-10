import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SETTINGS_KEYS = {
  APP_TITLE: 'app_title',
  APP_EMAIL: 'app_email',
  FOOTER_SETTINGS: 'footer_settings'
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Get all basic settings
      const settings = await prisma.settings.findMany({
        where: {
          category: 'basic'
        }
      });

      // Convert to key-value object
      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });

      // Parse footer settings
      let footerSettings = {
        description: 'Your comprehensive resource for projector setup, troubleshooting, and support.',
        quickLinks: [
          { label: 'Home', url: '/' },
          { label: 'All Articles', url: '/' }
        ],
        supportEmail: 'support@wzatco.com',
        supportPhone: '+91 XXX XXX XXXX',
        copyrightText: `© ${new Date().getFullYear()} WZATCO. All rights reserved.`
      };

      if (settingsObj[SETTINGS_KEYS.FOOTER_SETTINGS]) {
        try {
          footerSettings = JSON.parse(settingsObj[SETTINGS_KEYS.FOOTER_SETTINGS]);
        } catch (e) {
          console.error('Error parsing footer settings:', e);
        }
      }

      // Return with defaults if not set
      const result = {
        appTitle: settingsObj[SETTINGS_KEYS.APP_TITLE] || 'HelpDesk Pro',
        appEmail: settingsObj[SETTINGS_KEYS.APP_EMAIL] || 'support@helpdesk.com',
        footerSettings
      };

      res.status(200).json({ success: true, settings: result });
    } catch (error) {
      console.error('Error fetching basic settings:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'PATCH') {
    try {
      const { appTitle, appEmail, footerSettings } = req.body;

      // Update or create App Title
      if (appTitle !== undefined) {
        await prisma.settings.upsert({
          where: { key: SETTINGS_KEYS.APP_TITLE },
          update: { 
            value: appTitle.trim(),
            updatedAt: new Date()
          },
          create: {
            key: SETTINGS_KEYS.APP_TITLE,
            value: appTitle.trim(),
            description: 'Application title displayed in the system',
            category: 'basic'
          }
        });
      }

      // Update or create App Email
      if (appEmail !== undefined) {
        await prisma.settings.upsert({
          where: { key: SETTINGS_KEYS.APP_EMAIL },
          update: { 
            value: appEmail.trim(),
            updatedAt: new Date()
          },
          create: {
            key: SETTINGS_KEYS.APP_EMAIL,
            value: appEmail.trim(),
            description: 'Application support email address',
            category: 'basic'
          }
        });
      }

      // Update or create Footer Settings
      if (footerSettings !== undefined) {
        await prisma.settings.upsert({
          where: { key: SETTINGS_KEYS.FOOTER_SETTINGS },
          update: { 
            value: JSON.stringify(footerSettings),
            updatedAt: new Date()
          },
          create: {
            key: SETTINGS_KEYS.FOOTER_SETTINGS,
            value: JSON.stringify(footerSettings),
            description: 'Footer settings for public Knowledge Base',
            category: 'basic'
          }
        });
      }

      res.status(200).json({ success: true, message: 'Settings saved successfully' });
    } catch (error) {
      console.error('Error updating basic settings:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

