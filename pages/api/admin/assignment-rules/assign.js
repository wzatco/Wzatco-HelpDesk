import { assignTicket } from '../../../../lib/assignmentEngine';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { conversationId } = req.body;

      if (!conversationId) {
        return res.status(400).json({ message: 'Conversation ID is required' });
      }

      const result = await assignTicket(conversationId);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error assigning ticket:', error);
      return res.status(500).json({ message: 'Error assigning ticket', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}

