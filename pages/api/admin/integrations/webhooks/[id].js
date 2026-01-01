import prisma, { ensurePrismaConnected } from '@/lib/prisma';

// Prisma singleton pattern

export default async function handler(req, res) {
  await ensurePrismaConnected();
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const webhook = await prisma.webhook.findUnique({
        where: { id },
        include: {
          logs: {
            take: 50,
            orderBy: { createdAt: 'desc' }
          },
          _count: {
            select: { logs: true }
          }
        }
      });

      if (!webhook) {
        return res.status(404).json({ success: false, message: 'Webhook not found' });
      }

      res.status(200).json({ success: true, webhook });
    } catch (error) {
      console.error('Error fetching webhook:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  } else if (req.method === 'PATCH') {
    try {
      const {
        name,
        description,
        url,
        method,
        events,
        headers,
        secret,
        enabled,
        retryCount,
        timeout
      } = req.body;

      const updateData = {};

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (url !== undefined) {
        // Validate URL format
        try {
          new URL(url);
          updateData.url = url;
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'Invalid URL format'
          });
        }
      }
      if (method !== undefined) updateData.method = method.toUpperCase();
      if (events !== undefined) {
        try {
          const eventsArray = typeof events === 'string' ? JSON.parse(events) : events;
          if (!Array.isArray(eventsArray) || eventsArray.length === 0) {
            throw new Error('Events must be a non-empty array');
          }
          updateData.events = JSON.stringify(eventsArray);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'Events must be a valid JSON array'
          });
        }
      }
      if (headers !== undefined) {
        if (headers === null || headers === '') {
          updateData.headers = null;
        } else {
          try {
            const headersObj = typeof headers === 'string' ? JSON.parse(headers) : headers;
            updateData.headers = JSON.stringify(headersObj);
          } catch (e) {
            return res.status(400).json({
              success: false,
              message: 'Headers must be a valid JSON object'
            });
          }
        }
      }
      if (secret !== undefined) updateData.secret = secret || null;
      if (enabled !== undefined) updateData.enabled = enabled;
      if (retryCount !== undefined) updateData.retryCount = retryCount;
      if (timeout !== undefined) updateData.timeout = timeout;

      const webhook = await prisma.webhook.update({
        where: { id },
        data: updateData
      });

      res.status(200).json({ success: true, webhook });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ success: false, message: 'Webhook not found' });
      }
      console.error('Error updating webhook:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.webhook.delete({
        where: { id }
      });

      res.status(200).json({ success: true, message: 'Webhook deleted successfully' });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({ success: false, message: 'Webhook not found' });
      }
      console.error('Error deleting webhook:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

