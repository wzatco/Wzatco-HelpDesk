import prisma from '../../../../lib/prisma';

const SETTINGS_KEYS = {
  CAPTCHA_LENGTH: 'captcha_length',
  CAPTCHA_TYPE: 'captcha_type',
  CAPTCHA_ENABLED_PLACEMENTS: 'captcha_enabled_placements'
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Get all captcha settings
      const settings = await prisma.settings.findMany({
        where: {
          category: 'captcha'
        }
      });

      // Convert to key-value object
      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });

      // Parse enabled placements (stored as JSON)
      let enabledPlacements = {
        adminLogin: true,
        customerTicket: false,
        passwordReset: false
      };
      
      const placementsValue = settingsObj[SETTINGS_KEYS.CAPTCHA_ENABLED_PLACEMENTS];
      if (placementsValue) {
        try {
          enabledPlacements = JSON.parse(placementsValue);
        } catch (e) {
          console.error('Error parsing captcha placements:', e);
        }
      }

      // Return with defaults if not set
      const result = {
        captchaLength: parseInt(settingsObj[SETTINGS_KEYS.CAPTCHA_LENGTH] || '6', 10),
        captchaType: settingsObj[SETTINGS_KEYS.CAPTCHA_TYPE] || 'alphanumeric', // 'alphanumeric' or 'numeric'
        enabledPlacements: enabledPlacements
      };

      res.status(200).json({ success: true, settings: result });
    } catch (error) {
      console.error('Error fetching captcha settings:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { captchaLength, captchaType, enabledPlacements } = req.body;

      // Validate captcha length
      if (captchaLength !== undefined) {
        const length = parseInt(captchaLength, 10);
        if (isNaN(length) || length < 4 || length > 10) {
          return res.status(400).json({ 
            success: false, 
            message: 'Captcha length must be between 4 and 10' 
          });
        }
      }

      // Validate captcha type
      if (captchaType !== undefined && !['alphanumeric', 'numeric'].includes(captchaType)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Captcha type must be either "alphanumeric" or "numeric"' 
        });
      }

      // Update or create Captcha Length
      if (captchaLength !== undefined) {
        await prisma.settings.upsert({
          where: { key: SETTINGS_KEYS.CAPTCHA_LENGTH },
          update: { 
            value: captchaLength.toString(),
            updatedAt: new Date()
          },
          create: {
            key: SETTINGS_KEYS.CAPTCHA_LENGTH,
            value: captchaLength.toString(),
            description: 'Length of the captcha code (4-10 characters)',
            category: 'captcha'
          }
        });
      }

      // Update or create Captcha Type
      if (captchaType !== undefined) {
        await prisma.settings.upsert({
          where: { key: SETTINGS_KEYS.CAPTCHA_TYPE },
          update: { 
            value: captchaType,
            updatedAt: new Date()
          },
          create: {
            key: SETTINGS_KEYS.CAPTCHA_TYPE,
            value: captchaType,
            description: 'Type of captcha: alphanumeric (letters and numbers) or numeric (numbers only)',
            category: 'captcha'
          }
        });
      }

      // Update or create Captcha Enabled Placements
      if (enabledPlacements !== undefined) {
        await prisma.settings.upsert({
          where: { key: SETTINGS_KEYS.CAPTCHA_ENABLED_PLACEMENTS },
          update: { 
            value: JSON.stringify(enabledPlacements),
            updatedAt: new Date()
          },
          create: {
            key: SETTINGS_KEYS.CAPTCHA_ENABLED_PLACEMENTS,
            value: JSON.stringify(enabledPlacements),
            description: 'Captcha enabled placements (JSON): adminLogin, customerTicket, passwordReset',
            category: 'captcha'
          }
        });
      }

      res.status(200).json({ success: true, message: 'Captcha settings saved successfully' });
    } catch (error) {
      console.error('Error updating captcha settings:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

