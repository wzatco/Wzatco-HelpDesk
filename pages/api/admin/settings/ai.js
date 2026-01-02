import prisma from '@/lib/prisma';
import { getApiKeyPrefix } from '@/lib/crypto-utils';

const SETTINGS_KEYS = {
  AI_API_KEYS: 'ai_api_keys', // Store OpenAI keys in plain text (no encryption)
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

      // Parse API keys (stored in plain text, no encryption)
      let apiKeys = {};
      try {
        if (settingsObj[SETTINGS_KEYS.AI_API_KEYS]) {
          const keysData = JSON.parse(settingsObj[SETTINGS_KEYS.AI_API_KEYS]);
          // Show masked versions for display
          Object.keys(keysData).forEach(key => {
            if (keysData[key]) {
              apiKeys[key] = getApiKeyPrefix(keysData[key]); // Show only prefix
            }
          });
        }
      } catch (e) {
        console.error('Error parsing API keys:', e);
      }

      // Return with defaults if not set
      const result = {
        apiKeys: apiKeys || {}, // Masked keys for display
        hasApiKeys: Object.keys(apiKeys).length > 0, // Whether keys exist
        aiEnabled: settingsObj[SETTINGS_KEYS.AI_ENABLED] === 'true' || false
      };

      res.status(200).json({ success: true, settings: result });
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { apiKeys, aiEnabled } = req.body;

      // Update or create API Keys (stored in plain text, no encryption)
      if (apiKeys !== undefined) {
        const plainKeys = {};
        
        // Process each API key
        Object.keys(apiKeys).forEach(key => {
          const apiKey = apiKeys[key];
          if (apiKey && apiKey.trim() !== '') {
            // Only update if it's a new key (not a masked prefix)
            // If it starts with the prefix pattern, it's likely already stored
            if (!apiKey.includes('••••••••') && apiKey.length > 10) {
              // Store in plain text (no encryption)
              plainKeys[key] = apiKey.trim();
            }
          }
        });

        // Store plain text keys
        if (Object.keys(plainKeys).length > 0) {
          await prisma.settings.upsert({
            where: { key: SETTINGS_KEYS.AI_API_KEYS },
            update: { 
              value: JSON.stringify(plainKeys),
              updatedAt: new Date()
            },
            create: {
              key: SETTINGS_KEYS.AI_API_KEYS,
              value: JSON.stringify(plainKeys),
              description: 'AI API keys (stored in plain text)',
              category: 'ai'
            }
          });
        }
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
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

