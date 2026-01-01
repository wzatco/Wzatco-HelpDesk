import prisma from './prisma';

const SETTINGS_KEYS = {
  APP_TITLE: 'app_title',
  APP_EMAIL: 'app_email'
};

const DEFAULT_SETTINGS = {
  appTitle: 'HelpDesk Pro',
  appEmail: 'support@helpdesk.com'
};

/**
 * Get basic settings from database
 * This is a server-side function
 */
export async function getBasicSettings() {
  try {
    const settings = await prisma.settings.findMany({
      where: {
        category: 'basic'
      }
    });

    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    return {
      appTitle: settingsObj[SETTINGS_KEYS.APP_TITLE] || DEFAULT_SETTINGS.appTitle,
      appEmail: settingsObj[SETTINGS_KEYS.APP_EMAIL] || DEFAULT_SETTINGS.appEmail
    };
  } catch (error) {
    console.error('Error fetching basic settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Get a single setting value by key
 */
export async function getSetting(key, defaultValue = null) {
  try {
    const setting = await prisma.settings.findUnique({
      where: { key }
    });
    return setting?.value || defaultValue;
  } catch (error) {
    console.error(`Error fetching setting ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Get file upload settings from database
 */
export async function getFileUploadSettings() {
  try {
    const settings = await prisma.settings.findMany({
      where: {
        category: 'file_upload'
      }
    });

    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    // Parse allowed file types if stored as JSON
    let allowedFileTypes = [];
    try {
      if (settingsObj['file_upload_allowed_types']) {
        allowedFileTypes = JSON.parse(settingsObj['file_upload_allowed_types']);
      }
    } catch (e) {
      console.error('Error parsing allowed file types:', e);
    }

    return {
      maxUploadSize: parseInt(settingsObj['file_upload_max_size'] || '10', 10),
      allowedFileTypes: allowedFileTypes.length > 0 ? allowedFileTypes : [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'video/mp4', 'video/quicktime', 'application/zip'
      ],
      clientPhoneUpload: settingsObj['file_upload_client_phone'] === 'true' || true,
      ticketFileUpload: settingsObj['file_upload_ticket'] === 'true' || true
    };
  } catch (error) {
    console.error('Error fetching file upload settings:', error);
    return {
      maxUploadSize: 10,
      allowedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      clientPhoneUpload: true,
      ticketFileUpload: true
    };
  }
}

/**
 * Get ticket settings from database
 */
export async function getTicketSettings() {
  try {
    const settings = await prisma.settings.findMany({
      where: {
        category: 'ticket'
      }
    });

    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    return {
      anyStaffCanReply: settingsObj['ticket_any_staff_reply'] === 'true' || false,
      hidePriorityCustomer: settingsObj['ticket_hide_priority_customer'] === 'true' || false,
      hidePriorityAdmin: settingsObj['ticket_hide_priority_admin'] === 'true' || false,
      autoCloseEnabled: settingsObj['ticket_auto_close_enabled'] === 'true' || false,
      autoCloseHours: parseInt(settingsObj['ticket_auto_close_hours'] || '24', 10),
      closingMessage: settingsObj['ticket_closing_message'] || 'This ticket has been automatically closed due to inactivity.',
      userMaxOpenTickets: parseInt(settingsObj['ticket_user_max_open'] || '5', 10),
      userCanReopen: settingsObj['ticket_user_can_reopen'] === 'true' || true,
      reopenTimeDays: parseInt(settingsObj['ticket_reopen_time_days'] || '7', 10),
      positiveFeedbackMessage: settingsObj['ticket_positive_feedback'] || 'Thank you for your positive feedback!',
      negativeFeedbackMessage: settingsObj['ticket_negative_feedback'] || 'We apologize for the inconvenience. Our team will review your feedback and work to improve our service.'
    };
  } catch (error) {
    console.error('Error fetching ticket settings:', error);
    return {
      anyStaffCanReply: false,
      hidePriorityCustomer: false,
      hidePriorityAdmin: false,
      autoCloseEnabled: false,
      autoCloseHours: 24,
      closingMessage: 'This ticket has been automatically closed due to inactivity.',
      userMaxOpenTickets: 5,
      userCanReopen: true,
      reopenTimeDays: 7,
      positiveFeedbackMessage: 'Thank you for your positive feedback!',
      negativeFeedbackMessage: 'We apologize for the inconvenience. Our team will review your feedback and work to improve our service.'
    };
  }
}

/**
 * Get security settings from database
 */
export async function getSecuritySettings() {
  try {
    const settings = await prisma.settings.findMany({
      where: {
        category: 'security'
      }
    });

    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    // Parse spam email blocklist if stored as JSON
    let spamEmailBlocklist = [];
    try {
      if (settingsObj['security_spam_email_blocklist']) {
        spamEmailBlocklist = JSON.parse(settingsObj['security_spam_email_blocklist']);
      }
    } catch (e) {
      console.error('Error parsing spam email blocklist:', e);
    }

    return {
      adminLoginSecurity: settingsObj['security_admin_login'] === 'true' || true,
      accountLockEnabled: settingsObj['security_account_lock_enabled'] === 'true' || true,
      accountLockAttempts: parseInt(settingsObj['security_account_lock_attempts'] || '5', 10),
      accountLockMinutes: parseInt(settingsObj['security_account_lock_minutes'] || '15', 10),
      dosProtection: settingsObj['security_dos_protection'] === 'true' || true,
      spamEmailBlocklist: spamEmailBlocklist.length > 0 ? spamEmailBlocklist : []
    };
  } catch (error) {
    console.error('Error fetching security settings:', error);
    return {
      adminLoginSecurity: true,
      accountLockEnabled: true,
      accountLockAttempts: 5,
      accountLockMinutes: 15,
      dosProtection: true,
      spamEmailBlocklist: []
    };
  }
}

/**
 * Get notification settings from database
 */
export async function getNotificationSettings() {
  try {
    const settings = await prisma.settings.findMany({
      where: {
        category: 'notification'
      }
    });

    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    // Parse notification triggers if stored as JSON
    let triggers = {};
    try {
      if (settingsObj['notification_triggers']) {
        triggers = JSON.parse(settingsObj['notification_triggers']);
      }
    } catch (e) {
      console.error('Error parsing notification triggers:', e);
    }

    return {
      notificationEnabled: settingsObj['notification_enabled'] === 'true' || true, // Default to true
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
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return {
      notificationEnabled: true,
      triggers: {
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
  }
}


