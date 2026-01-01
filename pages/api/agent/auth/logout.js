/**
 * Agent Logout API
 * Clears the authentication cookie
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Clear the agentAuthToken cookie
    res.setHeader('Set-Cookie', [
      `agentAuthToken=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`
    ]);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Agent logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

