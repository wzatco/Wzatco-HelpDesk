import prisma from '@/lib/prisma';

// Prisma singleton pattern
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { enabled } = req.query;
      
      const where = {};
      if (enabled !== undefined) {
        where.enabled = enabled === 'true';
      }

      const webhooks = await prisma.webhook.findMany({
        where,
        include: {
          _count: {
            select: { logs: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json({ success: true, webhooks });
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const {
        name,
        description,
        url,
        method = 'POST',
        events,
        headers,
        secret,
        enabled = true,
        retryCount = 3,
        timeout = 30000
      } = req.body;

      // Validate required fields
      if (!name || !url || !events) {
        return res.status(400).json({
          success: false,
          message: 'Name, URL, and events are required'
        });
      }

      // Validate URL format
      try {
        new URL(url);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid URL format'
        });
      }

      // Validate events is an array
      let eventsArray;
      try {
        eventsArray = typeof events === 'string' ? JSON.parse(events) : events;
        if (!Array.isArray(eventsArray) || eventsArray.length === 0) {
          throw new Error('Events must be a non-empty array');
        }
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Events must be a valid JSON array'
        });
      }

      // Parse headers if provided
      let headersObj = null;
      if (headers) {
        try {
          headersObj = typeof headers === 'string' ? JSON.parse(headers) : headers;
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'Headers must be a valid JSON object'
          });
        }
      }

      const webhook = await prisma.webhook.create({
        data: {
          name,
          description,
          url,
          method: method.toUpperCase(),
          events: JSON.stringify(eventsArray),
          headers: headersObj ? JSON.stringify(headersObj) : null,
          secret: secret || null,
          enabled,
          retryCount,
          timeout
        }
      });

      res.status(201).json({ success: true, webhook });
    } catch (error) {
      console.error('Error creating webhook:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

