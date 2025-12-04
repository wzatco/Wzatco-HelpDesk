import { validateCaptcha } from '../../../../lib/captcha';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { userInput, correctCode } = req.body;

    if (!userInput || !correctCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both user input and correct code are required' 
      });
    }

    const isValid = validateCaptcha(userInput, correctCode);

    res.status(200).json({ 
      success: true, 
      valid: isValid 
    });
  } catch (error) {
    console.error('Error validating captcha:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to validate captcha' 
    });
  }
}

