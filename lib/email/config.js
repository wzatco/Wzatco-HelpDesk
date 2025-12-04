/**
 * Email configuration for Amazon SES SMTP
 * Loads from database first, then falls back to environment variables
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let cachedConfig = null;
let lastFetch = 0;
const CACHE_DURATION = 60000; // 1 minute cache

/**
 * Get email configuration from database or environment variables
 */
export async function getEmailConfig() {
  // Use cache if available and recent
  const now = Date.now();
  if (cachedConfig && (now - lastFetch) < CACHE_DURATION) {
    return cachedConfig;
  }

  try {
    const settings = await prisma.emailSettings.findUnique({
      where: { key: 'smtp_config' }
    });

    if (settings) {
      cachedConfig = {
        host: settings.host || process.env.MAIL_HOST || 'email-smtp.ap-south-1.amazonaws.com',
        port: settings.port || parseInt(process.env.MAIL_PORT || '465', 10),
        secure: (settings.encryption || process.env.MAIL_ENCRYPTION || 'ssl') === 'ssl',
        auth: {
          user: settings.username || process.env.MAIL_USERNAME || 'AKIA6ORTJ2B2BIIEBXP4',
          pass: settings.password || process.env.MAIL_PASSWORD || 'BE/EUXShtB4uCBdpo8fw4X15khfJ+GcGVxITmc4jvi66'
        },
        from: {
          address: settings.fromAddress || process.env.MAIL_FROM_ADDRESS || 'no-reply@wzatco.com',
          name: settings.fromName || process.env.MAIL_FROM_NAME || 'Wzatco Support Desk'
        },
        replyTo: settings.replyTo || process.env.MAIL_REPLY_TO || 'support@wzatco.com',
        debug: settings.debug || process.env.MAIL_DEBUG === 'true' || false
      };
    } else {
      // Fallback to environment variables
      cachedConfig = {
        host: process.env.MAIL_HOST || 'email-smtp.ap-south-1.amazonaws.com',
        port: parseInt(process.env.MAIL_PORT || '465', 10),
        secure: (process.env.MAIL_ENCRYPTION || 'ssl') === 'ssl',
        auth: {
          user: process.env.MAIL_USERNAME || 'AKIA6ORTJ2B2BIIEBXP4',
          pass: process.env.MAIL_PASSWORD || 'BE/EUXShtB4uCBdpo8fw4X15khfJ+GcGVxITmc4jvi66'
        },
        from: {
          address: process.env.MAIL_FROM_ADDRESS || 'no-reply@wzatco.com',
          name: process.env.MAIL_FROM_NAME || 'Wzatco Support Desk'
        },
        replyTo: process.env.MAIL_REPLY_TO || 'support@wzatco.com',
        debug: process.env.MAIL_DEBUG === 'true' || false
      };
    }

    lastFetch = now;
    return cachedConfig;
  } catch (error) {
    console.error('Error loading email config from database:', error);
    // Fallback to environment variables on error
    return {
      host: process.env.MAIL_HOST || 'email-smtp.ap-south-1.amazonaws.com',
      port: parseInt(process.env.MAIL_PORT || '465', 10),
      secure: (process.env.MAIL_ENCRYPTION || 'ssl') === 'ssl',
      auth: {
        user: process.env.MAIL_USERNAME || 'AKIA6ORTJ2B2BIIEBXP4',
        pass: process.env.MAIL_PASSWORD || 'BE/EUXShtB4uCBdpo8fw4X15khfJ+GcGVxITmc4jvi66'
      },
      from: {
        address: process.env.MAIL_FROM_ADDRESS || 'no-reply@wzatco.com',
        name: process.env.MAIL_FROM_NAME || 'Wzatco Support Desk'
      },
      replyTo: process.env.MAIL_REPLY_TO || 'support@wzatco.com',
      debug: process.env.MAIL_DEBUG === 'true' || false
    };
  }
}

/**
 * Clear the config cache (call this after updating settings)
 */
export function clearEmailConfigCache() {
  cachedConfig = null;
  lastFetch = 0;
}
