import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SETTINGS_KEYS = {
  ANY_STAFF_CAN_REPLY: 'ticket_any_staff_reply',
  HIDE_PRIORITY_CUSTOMER: 'ticket_hide_priority_customer',
  HIDE_PRIORITY_ADMIN: 'ticket_hide_priority_admin',
  AUTO_CLOSE_ENABLED: 'ticket_auto_close_enabled',
  AUTO_CLOSE_HOURS: 'ticket_auto_close_hours',
  CLOSING_MESSAGE: 'ticket_closing_message',
  USER_MAX_OPEN_TICKETS: 'ticket_user_max_open',
  USER_CAN_REOPEN: 'ticket_user_can_reopen',
  REOPEN_TIME_DAYS: 'ticket_reopen_time_days',
  POSITIVE_FEEDBACK_MESSAGE: 'ticket_positive_feedback',
  NEGATIVE_FEEDBACK_MESSAGE: 'ticket_negative_feedback'
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Get all ticket settings
      const settings = await prisma.settings.findMany({
        where: {
          category: 'ticket'
        }
      });

      // Convert to key-value object
      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });

      // Return with defaults if not set
      const result = {
        anyStaffCanReply: settingsObj[SETTINGS_KEYS.ANY_STAFF_CAN_REPLY] === 'true' || false,
        hidePriorityCustomer: settingsObj[SETTINGS_KEYS.HIDE_PRIORITY_CUSTOMER] === 'true' || false,
        hidePriorityAdmin: settingsObj[SETTINGS_KEYS.HIDE_PRIORITY_ADMIN] === 'true' || false,
        autoCloseEnabled: settingsObj[SETTINGS_KEYS.AUTO_CLOSE_ENABLED] === 'true' || false,
        autoCloseHours: settingsObj[SETTINGS_KEYS.AUTO_CLOSE_HOURS] || '24',
        closingMessage: settingsObj[SETTINGS_KEYS.CLOSING_MESSAGE] || 'This ticket has been automatically closed due to inactivity.',
        userMaxOpenTickets: settingsObj[SETTINGS_KEYS.USER_MAX_OPEN_TICKETS] || '5',
        userCanReopen: settingsObj[SETTINGS_KEYS.USER_CAN_REOPEN] === 'true' || true,
        reopenTimeDays: settingsObj[SETTINGS_KEYS.REOPEN_TIME_DAYS] || '7',
        positiveFeedbackMessage: settingsObj[SETTINGS_KEYS.POSITIVE_FEEDBACK_MESSAGE] || 'Thank you for your positive feedback!',
        negativeFeedbackMessage: settingsObj[SETTINGS_KEYS.NEGATIVE_FEEDBACK_MESSAGE] || 'We apologize for the inconvenience. Our team will review your feedback and work to improve our service.'
      };

      res.status(200).json({ success: true, settings: result });
    } catch (error) {
      console.error('Error fetching ticket settings:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'PATCH') {
    try {
      const {
        anyStaffCanReply,
        hidePriorityCustomer,
        hidePriorityAdmin,
        autoCloseEnabled,
        autoCloseHours,
        closingMessage,
        userMaxOpenTickets,
        userCanReopen,
        reopenTimeDays,
        positiveFeedbackMessage,
        negativeFeedbackMessage
      } = req.body;

      // Update or create each setting
      const updateSetting = async (key, value, description) => {
        await prisma.settings.upsert({
          where: { key },
          update: { 
            value: value.toString(),
            updatedAt: new Date()
          },
          create: {
            key,
            value: value.toString(),
            description,
            category: 'ticket'
          }
        });
      };

      if (anyStaffCanReply !== undefined) {
        await updateSetting(
          SETTINGS_KEYS.ANY_STAFF_CAN_REPLY,
          anyStaffCanReply,
          'Allow any staff member to reply to tickets'
        );
      }

      if (hidePriorityCustomer !== undefined) {
        await updateSetting(
          SETTINGS_KEYS.HIDE_PRIORITY_CUSTOMER,
          hidePriorityCustomer,
          'Hide priority input field for customers'
        );
      }

      if (hidePriorityAdmin !== undefined) {
        await updateSetting(
          SETTINGS_KEYS.HIDE_PRIORITY_ADMIN,
          hidePriorityAdmin,
          'Hide priority field in admin panel'
        );
      }

      if (autoCloseEnabled !== undefined) {
        await updateSetting(
          SETTINGS_KEYS.AUTO_CLOSE_ENABLED,
          autoCloseEnabled,
          'Enable automatic ticket closure'
        );
      }

      if (autoCloseHours !== undefined) {
        await updateSetting(
          SETTINGS_KEYS.AUTO_CLOSE_HOURS,
          autoCloseHours,
          'Hours of inactivity before auto-closing tickets'
        );
      }

      if (closingMessage !== undefined) {
        await updateSetting(
          SETTINGS_KEYS.CLOSING_MESSAGE,
          closingMessage,
          'Message displayed when tickets are auto-closed'
        );
      }

      if (userMaxOpenTickets !== undefined) {
        await updateSetting(
          SETTINGS_KEYS.USER_MAX_OPEN_TICKETS,
          userMaxOpenTickets,
          'Maximum number of open tickets per user'
        );
      }

      if (userCanReopen !== undefined) {
        await updateSetting(
          SETTINGS_KEYS.USER_CAN_REOPEN,
          userCanReopen,
          'Allow users to reopen closed tickets'
        );
      }

      if (reopenTimeDays !== undefined) {
        await updateSetting(
          SETTINGS_KEYS.REOPEN_TIME_DAYS,
          reopenTimeDays,
          'Number of days after closure when users can reopen tickets'
        );
      }

      if (positiveFeedbackMessage !== undefined) {
        await updateSetting(
          SETTINGS_KEYS.POSITIVE_FEEDBACK_MESSAGE,
          positiveFeedbackMessage,
          'Message shown for positive feedback'
        );
      }

      if (negativeFeedbackMessage !== undefined) {
        await updateSetting(
          SETTINGS_KEYS.NEGATIVE_FEEDBACK_MESSAGE,
          negativeFeedbackMessage,
          'Message shown for negative feedback'
        );
      }

      res.status(200).json({ success: true, message: 'Ticket settings saved successfully' });
    } catch (error) {
      console.error('Error updating ticket settings:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

