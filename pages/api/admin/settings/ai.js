import { PrismaClient } from '@prisma/client';
import { hashApiKey, getApiKeyPrefix, encryptApiKey, decryptApiKey } from '@/lib/crypto-utils';

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
  AI_API_KEYS: 'ai_api_keys',
  AI_API_KEYS_HASHED: 'ai_api_keys_hashed', // Store hashed keys
  AI_API_KEYS_ENCRYPTED: 'ai_api_keys_encrypted', // Store encrypted keys for retrieval
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

      // Parse encrypted API keys if stored
      let apiKeys = {};
      let apiKeysHashed = {};
      try {
        // Get encrypted keys for display (masked)
        if (settingsObj[SETTINGS_KEYS.AI_API_KEYS_ENCRYPTED]) {
          const encryptedData = JSON.parse(settingsObj[SETTINGS_KEYS.AI_API_KEYS_ENCRYPTED]);
          // Decrypt and show masked versions
          Object.keys(encryptedData).forEach(key => {
            const decrypted = decryptApiKey(encryptedData[key]);
            if (decrypted) {
              apiKeys[key] = getApiKeyPrefix(decrypted); // Show only prefix
            }
          });
        }
        
        // Get hashed keys for verification
        if (settingsObj[SETTINGS_KEYS.AI_API_KEYS_HASHED]) {
          apiKeysHashed = JSON.parse(settingsObj[SETTINGS_KEYS.AI_API_KEYS_HASHED]);
        }
      } catch (e) {
        console.error('Error parsing API keys:', e);
      }

      // Return with defaults if not set
      const result = {
        apiKeys: apiKeys || {}, // Masked keys for display
        apiKeysHashed: apiKeysHashed || {}, // Hashed keys (for verification)
        hasApiKeys: Object.keys(apiKeysHashed).length > 0, // Whether keys exist
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

      // Update or create API Keys with HMAC hashing
      if (apiKeys !== undefined) {
        const hashedKeys = {};
        const encryptedKeys = {};
        
        // Process each API key
        Object.keys(apiKeys).forEach(key => {
          const apiKey = apiKeys[key];
          if (apiKey && apiKey.trim() !== '') {
            // Only update if it's a new key (not a masked prefix)
            // If it starts with the prefix pattern, it's likely already stored
            if (!apiKey.includes('••••••••') && apiKey.length > 10) {
              // Hash for verification
              hashedKeys[key] = hashApiKey(apiKey);
              // Encrypt for storage (so we can decrypt when needed)
              encryptedKeys[key] = encryptApiKey(apiKey);
            }
          }
        });

        // Store hashed keys (for verification)
        if (Object.keys(hashedKeys).length > 0) {
          await prisma.settings.upsert({
            where: { key: SETTINGS_KEYS.AI_API_KEYS_HASHED },
            update: { 
              value: JSON.stringify(hashedKeys),
              updatedAt: new Date()
            },
            create: {
              key: SETTINGS_KEYS.AI_API_KEYS_HASHED,
              value: JSON.stringify(hashedKeys),
              description: 'AI API keys (HMAC hashed for verification)',
              category: 'ai'
            }
          });
        }

        // Store encrypted keys (for retrieval when needed)
        if (Object.keys(encryptedKeys).length > 0) {
          await prisma.settings.upsert({
            where: { key: SETTINGS_KEYS.AI_API_KEYS_ENCRYPTED },
            update: { 
              value: JSON.stringify(encryptedKeys),
              updatedAt: new Date()
            },
            create: {
              key: SETTINGS_KEYS.AI_API_KEYS_ENCRYPTED,
              value: JSON.stringify(encryptedKeys),
              description: 'AI API keys (encrypted for secure storage)',
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

