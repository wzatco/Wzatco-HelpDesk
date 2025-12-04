import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SETTINGS_KEYS = {
  AI_API_KEYS: 'ai_api_keys',
  AI_ENABLED: 'ai_enabled'
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Get all AI settings
      const settings = await prisma.settings.findMany({
        where: {
          category: 'ai'
        }
      });

      // Convert to key-value object
      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });

      // Parse API keys if stored as JSON
      let apiKeys = {};
      try {
        if (settingsObj[SETTINGS_KEYS.AI_API_KEYS]) {
          apiKeys = JSON.parse(settingsObj[SETTINGS_KEYS.AI_API_KEYS]);
        }
      } catch (e) {
        console.error('Error parsing API keys:', e);
      }

      // Return with defaults if not set
      const result = {
        apiKeys: apiKeys || {},
        aiEnabled: settingsObj[SETTINGS_KEYS.AI_ENABLED] === 'true' || false
      };

      res.status(200).json({ success: true, settings: result });
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'PATCH') {
    try {
      const { apiKeys, aiEnabled } = req.body;

      // Update or create API Keys
      if (apiKeys !== undefined) {
        // Store as JSON string
        const apiKeysJson = JSON.stringify(apiKeys || {});
        await prisma.settings.upsert({
          where: { key: SETTINGS_KEYS.AI_API_KEYS },
          update: { 
            value: apiKeysJson,
            updatedAt: new Date()
          },
          create: {
            key: SETTINGS_KEYS.AI_API_KEYS,
            value: apiKeysJson,
            description: 'AI API keys (stored as JSON object)',
            category: 'ai'
          }
        });
      }

      // Update or create AI Enabled setting
      if (aiEnabled !== undefined) {
        await prisma.settings.upsert({
          where: { key: SETTINGS_KEYS.AI_ENABLED },
          update: { 
            value: aiEnabled.toString(),
            updatedAt: new Date()
          },
          create: {
            key: SETTINGS_KEYS.AI_ENABLED,
            value: aiEnabled.toString(),
            description: 'Enable or disable AI features',
            category: 'ai'
          }
        });
      }

      res.status(200).json({ success: true, message: 'AI settings saved successfully' });
    } catch (error) {
      console.error('Error updating AI settings:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

