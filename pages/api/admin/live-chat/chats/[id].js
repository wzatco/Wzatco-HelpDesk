// Proxy API route to widget backend for getting a single chat
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const widgetBackendUrl = process.env.WIDGET_BACKEND_URL || 'http://localhost:5000';
    const { id } = req.query;

    const url = `${widgetBackendUrl}/api/chats/${id}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization && { Authorization: req.headers.authorization }),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching chat:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch chat',
      message: error.message 
    });
  }
}

