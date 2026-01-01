// Proxy API route to assign chat to agent via Socket.IO
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const widgetBackendUrl = process.env.WIDGET_BACKEND_URL || 'http://localhost:5000';
    const { id } = req.query;
    const { agentId, agentName } = req.body;

    // This will be handled via Socket.IO, but we can also update via REST API if available
    // For now, return success - actual assignment happens via Socket.IO
    return res.status(200).json({ 
      success: true, 
      message: 'Chat assignment will be processed via Socket.IO',
      chatId: id 
    });
  } catch (error) {
    console.error('Error assigning chat:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to assign chat',
      message: error.message 
    });
  }
}

