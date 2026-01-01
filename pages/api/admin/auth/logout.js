/**
 * Logout API
 * Clears the authentication cookie
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Clear the authToken cookie
    res.setHeader('Set-Cookie', [
      'authToken=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/',
    ]);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

