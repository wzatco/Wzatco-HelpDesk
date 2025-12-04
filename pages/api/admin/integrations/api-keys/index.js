import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Generate a secure API key
function generateApiKey(prefix = 'sk_live_') {
  const randomBytes = crypto.randomBytes(32);
  const key = randomBytes.toString('base64url');
  return {
    fullKey: `${prefix}${key}`,
    keyPrefix: prefix,
    hashedKey: crypto.createHash('sha256').update(`${prefix}${key}`).digest('hex')
  };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { enabled } = req.query;
      
      const where = {};
      if (enabled !== undefined) {
        where.enabled = enabled === 'true';
      }

      const apiKeys = await prisma.apiKey.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      // Don't send the full key, only the prefix
      const sanitizedKeys = apiKeys.map(key => ({
        ...key,
        key: undefined, // Remove the hashed key from response
        keyPrefix: key.keyPrefix
      }));

      res.status(200).json({ success: true, apiKeys: sanitizedKeys });
    } catch (error) {
      console.error('Error fetching API keys:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'POST') {
    try {
      const {
        name,
        scopes,
        expiresAt,
        enabled = true
      } = req.body;

      // Validate required fields
      if (!name || !scopes) {
        return res.status(400).json({
          success: false,
          message: 'Name and scopes are required'
        });
      }

      // Validate scopes is an array
      let scopesArray;
      try {
        scopesArray = typeof scopes === 'string' ? JSON.parse(scopes) : scopes;
        if (!Array.isArray(scopesArray) || scopesArray.length === 0) {
          throw new Error('Scopes must be a non-empty array');
        }
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Scopes must be a valid JSON array'
        });
      }

      // Generate API key
      const { fullKey, keyPrefix, hashedKey } = generateApiKey();

      // Parse expiration date if provided
      let expiresAtDate = null;
      if (expiresAt) {
        expiresAtDate = new Date(expiresAt);
        if (isNaN(expiresAtDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid expiration date format'
          });
        }
      }

      const apiKey = await prisma.apiKey.create({
        data: {
          name,
          key: hashedKey,
          keyPrefix,
          scopes: JSON.stringify(scopesArray),
          expiresAt: expiresAtDate,
          enabled
        }
      });

      // Return the full key only once (for display to user)
      res.status(201).json({
        success: true,
        apiKey: {
          ...apiKey,
          key: fullKey // Return the full key only on creation
        },
        message: 'API key created successfully. Please save this key securely - it will not be shown again.'
      });
    } catch (error) {
      console.error('Error creating API key:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

