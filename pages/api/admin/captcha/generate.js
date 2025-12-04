import { generateCaptcha } from '../../../../lib/captcha';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const captcha = await generateCaptcha();
    
    // Store captcha in session or return it (for client-side validation, we'll return it)
    // In production, you might want to store it server-side with a session ID
    res.status(200).json({ 
      success: true, 
      captcha 
    });
  } catch (error) {
    console.error('Error generating captcha:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate captcha' 
    });
  }
}

