import { previewAssignment } from '../../../../lib/assignmentEngine';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { conversation } = req.body;

      if (!conversation) {
        return res.status(400).json({ message: 'Conversation data is required' });
      }

      const result = await previewAssignment(conversation);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error previewing assignment:', error);
      return res.status(500).json({ message: 'Error previewing assignment', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}

