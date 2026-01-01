import prisma, { ensurePrismaConnected } from '@/lib/prisma';


export default async function handler(req, res) {
  await ensurePrismaConnected();
  if (req.method === 'GET') {
    try {
      const filters = await prisma.savedFilter.findMany({
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json({ filters });
    } catch (error) {
      console.error('Error fetching saved filters:', error);
      return res.status(500).json({ message: 'Error fetching saved filters', error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, description, filters: filterConfig, createdBy } = req.body;

      if (!name || !filterConfig) {
        return res.status(400).json({ message: 'Name and filters are required' });
      }

      const filter = await prisma.savedFilter.create({
        data: {
          name,
          description: description || null,
          filters: JSON.stringify(filterConfig),
          createdBy: createdBy || 'admin'
        }
      });

      return res.status(201).json({ filter });
    } catch (error) {
      console.error('Error creating saved filter:', error);
      return res.status(500).json({ message: 'Error creating saved filter', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}

