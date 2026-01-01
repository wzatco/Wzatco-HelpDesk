import { getBasicSettings } from './settings';

const SETTINGS_KEYS = {
  CAPTCHA_LENGTH: 'captcha_length',
  CAPTCHA_TYPE: 'captcha_type'
};

/**
 * Generate a random captcha code based on settings
 * @param {Object} options - Optional overrides
 * @param {number} options.length - Override captcha length
 * @param {string} options.type - Override captcha type ('alphanumeric' or 'numeric')
 * @returns {Promise<string>} - Generated captcha code
 */
export async function generateCaptcha(options = {}) {
  try {
    // Get settings from database
    const prismaModule = await import('./prisma');
    const prisma = prismaModule.default;

    try {
      const settings = await prisma.settings.findMany({
        where: {
          category: 'captcha'
        }
      });

      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });

      const length = options.length || parseInt(settingsObj[SETTINGS_KEYS.CAPTCHA_LENGTH] || '6', 10);
      const type = options.type || settingsObj[SETTINGS_KEYS.CAPTCHA_TYPE] || 'alphanumeric';

      // Validate length
      const validLength = Math.max(4, Math.min(10, length));

      let characters = '';
      if (type === 'numeric') {
        characters = '0123456789';
      } else {
        // Alphanumeric - exclude similar looking characters (0, O, I, l, 1)
        characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      }

      // Generate random captcha
      let captcha = '';
      for (let i = 0; i < validLength; i++) {
        captcha += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      return captcha;
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Error generating captcha:', error);
    // Fallback to default
    const length = options.length || 6;
    const type = options.type || 'alphanumeric';
    const validLength = Math.max(4, Math.min(10, length));
    
    let characters = type === 'numeric' ? '0123456789' : 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let captcha = '';
    for (let i = 0; i < validLength; i++) {
      captcha += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return captcha;
  }
}

/**
 * Validate captcha code (case-insensitive)
 * @param {string} userInput - User's input
 * @param {string} correctCode - Correct captcha code
 * @returns {boolean} - True if valid
 */
export function validateCaptcha(userInput, correctCode) {
  if (!userInput || !correctCode) return false;
  return userInput.trim().toUpperCase() === correctCode.toUpperCase();
}

/**
 * Get captcha settings (for client-side use)
 * @returns {Promise<Object>} - Captcha settings
 */
export async function getCaptchaSettings() {
  try {
    const prismaModule = await import('./prisma');
    const prisma = prismaModule.default;

    try {
      const settings = await prisma.settings.findMany({
        where: {
          category: 'captcha'
        }
      });

      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });

      return {
        length: parseInt(settingsObj[SETTINGS_KEYS.CAPTCHA_LENGTH] || '6', 10),
        type: settingsObj[SETTINGS_KEYS.CAPTCHA_TYPE] || 'alphanumeric'
      };
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Error fetching captcha settings:', error);
    return {
      length: 6,
      type: 'alphanumeric'
    };
  }
}

