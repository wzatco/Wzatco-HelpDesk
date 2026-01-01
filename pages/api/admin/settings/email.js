import prisma, { ensurePrismaConnected } from '@/lib/prisma';

export default async function handler(req, res) {
  const SETTINGS_KEY = 'smtp_config';

  if (req.method === 'GET') {
  try {
      await ensurePrismaConnected();
      // Get settings from database, or return defaults
      let settings = await prisma.emailSettings.findUnique({
        where: { key: SETTINGS_KEY }
      });

      // If no settings in DB, return defaults from env
      if (!settings) {
        settings = {
          host: process.env.MAIL_HOST || 'email-smtp.ap-south-1.amazonaws.com',
          port: parseInt(process.env.MAIL_PORT || '465', 10),
          encryption: process.env.MAIL_ENCRYPTION || 'ssl',
          username: process.env.MAIL_USERNAME || 'AKIA6ORTJ2B2BIIEBXP4',
          password: process.env.MAIL_PASSWORD || 'BE/EUXShtB4uCBdpo8fw4X15khfJ+GcGVxITmc4jvi66',
          fromAddress: process.env.MAIL_FROM_ADDRESS || 'no-reply@wzatco.com',
          fromName: process.env.MAIL_FROM_NAME || 'Wzatco Support Desk',
          replyTo: process.env.MAIL_REPLY_TO || 'support@wzatco.com',
          debug: process.env.MAIL_DEBUG === 'true' || false
        };
      } else {
        // Don't send password in GET request for security
        settings.password = settings.password ? '••••••••••••••••' : null;
      }

      res.status(200).json({ settings });
    } catch (error) {
      console.error('Error fetching email settings:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'PATCH') {
    try {
      const {
        host,
        port,
        encryption,
        username,
        password,
        fromAddress,
        fromName,
        replyTo,
        debug
      } = req.body;

      // Validate required fields
      if (!host || !port || !username || !fromAddress || !fromName) {
        return res.status(400).json({ 
          message: 'Host, Port, Username, From Address, and From Name are required' 
        });
      }

      // Check if password is being updated (if it's the masked value, don't update)
      const updateData = {
        host: host.trim(),
        port: parseInt(port, 10),
        encryption: encryption || 'ssl',
        username: username.trim(),
        fromAddress: fromAddress.trim(),
        fromName: fromName.trim(),
        replyTo: replyTo?.trim() || null,
        debug: debug === true || debug === 'true'
      };

      // Only update password if it's not the masked value
      if (password && password !== '••••••••••••••••' && password.trim() !== '') {
        updateData.password = password.trim();
      }

      // Upsert settings
      const settings = await prisma.emailSettings.upsert({
        where: { key: SETTINGS_KEY },
        update: updateData,
        create: {
          key: SETTINGS_KEY,
          ...updateData
        }
      });

      // Don't send password in response
      const responseSettings = { ...settings };
      responseSettings.password = settings.password ? '••••••••••••••••' : null;

      // Clear email config cache so new settings are used immediately
      try {
        const { clearEmailConfigCache } = await import('../../../../lib/email/config');
        clearEmailConfigCache();
      } catch (err) {
        console.error('Error clearing email config cache:', err);
      }

      res.status(200).json({ 
        message: 'Email settings updated successfully',
        settings: responseSettings
      });
    } catch (error) {
      console.error('Error updating email settings:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

