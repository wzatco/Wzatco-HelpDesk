import { PrismaClient } from '@prisma/client';

// Prisma singleton pattern
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const apiKey = await prisma.apiKey.findUnique({
        where: { id }
      });

      if (!apiKey) {
        return res.status(404).json({ success: false, message: 'API key not found' });
      }

      // Don't send the hashed key
      const sanitizedKey = {
        ...apiKey,
        key: undefined,
        keyPrefix: apiKey.keyPrefix
      };

      res.status(200).json({ success: true, apiKey: sanitizedKey });
    } catch (error) {
      console.error('Error fetching API key:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  } else if (req.method === 'PATCH') {
    try {
      const {
        name,
        scopes,
        expiresAt,
        enabled
      } = req.body;

      const updateData = {};

      if (name !== undefined) updateData.name = name;
      if (scopes !== undefined) {
        try {
          const scopesArray = typeof scopes === 'string' ? JSON.parse(scopes) : scopes;
          if (!Array.isArray(scopesArray) || scopesArray.length === 0) {
            throw new Error('Scopes must be a non-empty array');
          }
          updateData.scopes = JSON.stringify(scopesArray);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'Scopes must be a valid JSON array'
          });
        }
      }
      if (expiresAt !== undefined) {
        if (expiresAt === null || expiresAt === '') {
          updateData.expiresAt = null;
        } else {
          const expiresAtDate = new Date(expiresAt);
          if (isNaN(expiresAtDate.getTime())) {
            return res.status(400).json({
              success: false,
              message: 'Invalid expiration date format'
            });
          }
          updateData.expiresAt = expiresAtDate;
        }
      }
      if (enabled !== undefined) updateData.enabled = enabled;

      const apiKey = await prisma.apiKey.update({
        where: { id },
        data: updateData
      });

      // Don't send the hashed key
      const sanitizedKey = {
        ...apiKey,
        key: undefined,
        keyPrefix: apiKey.keyPrefix
      };

      res.status(200).json({ success: true, apiKey: sanitizedKey });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ success: false, message: 'API key not found' });
      }
      console.error('Error updating API key:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.apiKey.delete({
        where: { id }
      });

      res.status(200).json({ success: true, message: 'API key deleted successfully' });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ success: false, message: 'API key not found' });
      }
      console.error('Error deleting API key:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

