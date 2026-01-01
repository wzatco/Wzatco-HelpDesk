import prisma from '../prisma';
import crypto from 'crypto';

/**
 * Send webhook event to all enabled webhooks that listen to this event
 * @param {string} event - Event name (e.g., 'ticket.created', 'ticket.updated')
 * @param {object} payload - Payload data to send
 */
export async function triggerWebhook(event, payload) {
  try {
    // Find all enabled webhooks that listen to this event
    const webhooks = await prisma.webhook.findMany({
      where: {
        enabled: true
      }
    });

    if (webhooks.length === 0) {
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    // Process each webhook
    for (const webhook of webhooks) {
      try {
        const events = JSON.parse(webhook.events);
        
        // Check if this webhook listens to this event
        if (!events.includes(event) && !events.includes('*')) {
          continue; // Skip this webhook
        }

        // Send webhook with retry logic
        const result = await sendWebhookWithRetry(webhook, event, payload);
        
        if (result.success) {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Error processing webhook ${webhook.id}:`, error);
        failed++;
      }
    }

    return { sent, failed };
  } catch (error) {
    console.error('Error triggering webhooks:', error);
    return { sent: 0, failed: 0, error: error.message };
  }
}

/**
 * Send webhook with retry logic
 * @param {object} webhook - Webhook configuration
 * @param {string} event - Event name
 * @param {object} payload - Payload data
 */
async function sendWebhookWithRetry(webhook, event, payload) {
  const maxRetries = webhook.retryCount || 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendWebhook(webhook, event, payload, attempt);
      
      if (result.success) {
        return result;
      }
      
      lastError = result.error;
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      lastError = error.message;
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return {
    success: false,
    error: lastError || 'Max retries exceeded',
    attempts: maxRetries
  };
}

/**
 * Send a single webhook request
 * @param {object} webhook - Webhook configuration
 * @param {string} event - Event name
 * @param {object} payload - Payload data
 * @param {number} attemptNumber - Current attempt number
 */
async function sendWebhook(webhook, event, payload, attemptNumber = 1) {
  const startTime = Date.now();

  // Prepare payload with event info
  const webhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data: payload
  };

  // Parse headers
  const headers = webhook.headers ? JSON.parse(webhook.headers) : {};
  headers['Content-Type'] = 'application/json';
  headers['User-Agent'] = 'HelpDesk-Webhook/1.0';

  // Add webhook signature if secret is provided
  if (webhook.secret) {
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(webhookPayload))
      .digest('hex');
    headers['X-Webhook-Signature'] = `sha256=${signature}`;
  }

  try {
    const response = await fetch(webhook.url, {
      method: webhook.method || 'POST',
      headers,
      body: JSON.stringify(webhookPayload),
      signal: AbortSignal.timeout(webhook.timeout || 30000)
    });

    const duration = Date.now() - startTime;
    const responseBody = await response.text();

    const success = response.ok;

    // Log the webhook attempt
    await prisma.webhookLog.create({
      data: {
        webhookId: webhook.id,
        event,
        payload: JSON.stringify(webhookPayload),
        responseCode: response.status,
        responseBody: responseBody.substring(0, 1000), // Limit response body size
        success,
        errorMessage: success ? null : `HTTP ${response.status}: ${response.statusText}`,
        attemptNumber,
        duration
      }
    });

    return {
      success,
      statusCode: response.status,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log the failed attempt
    await prisma.webhookLog.create({
      data: {
        webhookId: webhook.id,
        event,
        payload: JSON.stringify(webhookPayload),
        responseCode: null,
        responseBody: null,
        success: false,
        errorMessage: error.message,
        attemptNumber,
        duration
      }
    });

    return {
      success: false,
      error: error.message,
      duration
    };
  }
}

