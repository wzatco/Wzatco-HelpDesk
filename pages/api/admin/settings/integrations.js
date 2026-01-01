import prisma from '../../../../lib/prisma';

export default async function handler(req, res) {
  const { method } = req;

  try {
    if (method === 'GET') {
      // Fetch integration settings
      const settings = await prisma.settings.findFirst({
        where: { category: 'integrations' }
      });

      // If no settings exist, return defaults
      if (!settings) {
        return res.status(200).json({
          success: true,
          settings: {
            googleClientId: '',
            googleClientSecret: '',
            isGoogleAuthEnabled: false,
            aiApiKey: '',
            aiProvider: 'openai',
            isAiEnabled: false
          }
        });
      }

      // Mask sensitive keys (show only last 4 characters)
      const maskKey = (key) => {
        if (!key) return '';
        if (key.length <= 4) return '••••';
        return '•'.repeat(key.length - 4) + key.slice(-4);
      };

      return res.status(200).json({
        success: true,
        settings: {
          googleClientId: maskKey(settings.googleClientId),
          googleClientSecret: maskKey(settings.googleClientSecret),
          isGoogleAuthEnabled: settings.isGoogleAuthEnabled,
          aiApiKey: maskKey(settings.aiApiKey),
          aiProvider: settings.aiProvider || 'openai',
          isAiEnabled: settings.isAiEnabled
        }
      });
    } else if (method === 'POST') {
      // Save integration settings
      const {
        googleClientId,
        googleClientSecret,
        isGoogleAuthEnabled,
        aiApiKey,
        aiProvider,
        isAiEnabled
      } = req.body;

      // Find or create settings record
      let settings = await prisma.settings.findFirst({
        where: { category: 'integrations' }
      });

      // Prepare update data
      const updateData = {
        category: 'integrations',
        key: 'integrations',
        isGoogleAuthEnabled: isGoogleAuthEnabled || false,
        aiProvider: aiProvider || 'openai',
        isAiEnabled: isAiEnabled || false
      };

      // Only update keys if they're not masked (not all dots)
      if (googleClientId && !googleClientId.match(/^[•]+/)) {
        updateData.googleClientId = googleClientId;
      }
      if (googleClientSecret && !googleClientSecret.match(/^[•]+/)) {
        updateData.googleClientSecret = googleClientSecret;
      }
      if (aiApiKey && !aiApiKey.match(/^[•]+/)) {
        updateData.aiApiKey = aiApiKey;
      }

      if (settings) {
        // Update existing settings
        settings = await prisma.settings.update({
          where: { id: settings.id },
          data: updateData
        });
      } else {
        // Create new settings
        settings = await prisma.settings.create({
          data: updateData
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Integration settings saved successfully'
      });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({
        success: false,
        message: `Method ${method} Not Allowed`
      });
    }
  } catch (error) {
    console.error('Error handling integration settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to handle integration settings',
      error: error.message
    });
  }
}
