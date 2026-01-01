// Admin API - Approve Callback
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }

  try {
    const { id } = req.query;

    const callback = await prisma.scheduledCallback.update({
      where: { id },
      data: {
        status: 'approved'
      }
    });

    res.status(200).json({ success: true, callback });
  } catch (error) {
    console.error('Error approving callback:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  } 
}

