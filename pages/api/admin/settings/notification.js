import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SETTINGS_KEYS = {
  NOTIFICATION_ENABLED: 'notification_enabled',
  NOTIFICATION_TRIGGERS: 'notification_triggers'
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Get all notification settings
      const settings = await prisma.settings.findMany({
        where: {
          category: 'notification'
        }
      });

      // Convert to key-value object
      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });

      // Parse notification triggers if stored as JSON
      let triggers = {};
      try {
        if (settingsObj[SETTINGS_KEYS.NOTIFICATION_TRIGGERS]) {
          triggers = JSON.parse(settingsObj[SETTINGS_KEYS.NOTIFICATION_TRIGGERS]);
        }
      } catch (e) {
        console.error('Error parsing notification triggers:', e);
      }

      // Return with defaults if not set
      const result = {
        notificationEnabled: settingsObj[SETTINGS_KEYS.NOTIFICATION_ENABLED] === 'true' || true, // Default to true
        triggers: Object.keys(triggers).length > 0 ? triggers : {
          ticketCreated: true,
          ticketAssigned: true,
          ticketUpdated: true,
          ticketResolved: true,
          ticketClosed: true,
          messageReceived: true,
          mentionReceived: true,
          slaRisk: true,
          slaBreached: true
        }
      };

      res.status(200).json({ success: true, settings: result });
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'PATCH') {
    try {
      const { notificationEnabled, triggers } = req.body;

      // Update or create Notification Enabled setting
      if (notificationEnabled !== undefined) {
        await prisma.settings.upsert({
          where: { key: SETTINGS_KEYS.NOTIFICATION_ENABLED },
          update: { 
            value: notificationEnabled.toString(),
            updatedAt: new Date()
          },
          create: {
            key: SETTINGS_KEYS.NOTIFICATION_ENABLED,
            value: notificationEnabled.toString(),
            description: 'Enable or disable the notification system',
            category: 'notification'
          }
        });
      }

      // Update or create Notification Triggers
      if (triggers !== undefined) {
        const triggersJson = JSON.stringify(triggers);
        await prisma.settings.upsert({
          where: { key: SETTINGS_KEYS.NOTIFICATION_TRIGGERS },
          update: { 
            value: triggersJson,
            updatedAt: new Date()
          },
          create: {
            key: SETTINGS_KEYS.NOTIFICATION_TRIGGERS,
            value: triggersJson,
            description: 'Configure which events trigger notifications (stored as JSON object)',
            category: 'notification'
          }
        });
      }

      res.status(200).json({ success: true, message: 'Notification settings saved successfully' });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

