import prisma from '@/lib/prisma';
import crypto from 'crypto';

// Prisma singleton pattern
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const webhook = await prisma.webhook.findUnique({
      where: { id }
    });

    if (!webhook) {
      return res.status(404).json({ success: false, message: 'Webhook not found' });
    }

    // Create test payload
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from your helpdesk system',
        webhookId: webhook.id,
        webhookName: webhook.name
      }
    };

    // Parse webhook configuration
    const events = JSON.parse(webhook.events);
    const headers = webhook.headers ? JSON.parse(webhook.headers) : {};
    const method = webhook.method || 'POST';

    // Add webhook signature if secret is provided
    if (webhook.secret) {
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(JSON.stringify(testPayload))
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    // Add default headers
    headers['Content-Type'] = 'application/json';
    headers['User-Agent'] = 'HelpDesk-Webhook/1.0';

    const startTime = Date.now();

    try {
      const response = await fetch(webhook.url, {
        method,
        headers,
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(webhook.timeout || 30000)
      });

      const duration = Date.now() - startTime;
      const responseBody = await response.text();

      // Log the test attempt
      await prisma.webhookLog.create({
        data: {
          webhookId: webhook.id,
          event: 'webhook.test',
          payload: JSON.stringify(testPayload),
          responseCode: response.status,
          responseBody: responseBody.substring(0, 1000), // Limit response body size
          success: response.ok,
          errorMessage: response.ok ? null : `HTTP ${response.status}`,
          attemptNumber: 1,
          duration
        }
      });

      res.status(200).json({
        success: true,
        message: 'Test webhook sent successfully',
        result: {
          statusCode: response.status,
          statusText: response.statusText,
          duration,
          responseBody: responseBody.substring(0, 500) // Limit in response
        }
      });
    } catch (fetchError) {
      const duration = Date.now() - startTime;

      // Log the failed attempt
      await prisma.webhookLog.create({
        data: {
          webhookId: webhook.id,
          event: 'webhook.test',
          payload: JSON.stringify(testPayload),
          responseCode: null,
          responseBody: null,
          success: false,
          errorMessage: fetchError.message,
          attemptNumber: 1,
          duration
        }
      });

      res.status(500).json({
        success: false,
        message: 'Failed to send test webhook',
        error: fetchError.message,
        duration
      });
    }
  } catch (error) {
    console.error('Error testing webhook:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
}

