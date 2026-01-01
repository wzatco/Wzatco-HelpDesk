// Check if Google Auth is enabled
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const settings = await prisma.settings.findFirst({
      where: { category: 'integrations' }
    });

    const enabled = !!(settings && settings.isGoogleAuthEnabled && settings.googleClientId && settings.googleClientSecret);

    res.status(200).json({ enabled });
  } catch (error) {
    console.error('Error checking Google Auth status:', error);
    res.status(200).json({ enabled: false });
  } finally {
    await prisma.$disconnect();
  }
}
