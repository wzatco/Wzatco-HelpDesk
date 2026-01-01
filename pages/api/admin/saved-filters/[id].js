import prisma, { ensurePrismaConnected } from '@/lib/prisma';


export default async function handler(req, res) {
  await ensurePrismaConnected();
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const filter = await prisma.savedFilter.findUnique({
        where: { id }
      });

      if (!filter) {
        return res.status(404).json({ message: 'Saved filter not found' });
      }

      return res.status(200).json({ filter });
    } catch (error) {
      console.error('Error fetching saved filter:', error);
      return res.status(500).json({ message: 'Error fetching saved filter', error: error.message });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { name, description, filters: filterConfig } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description || null;
      if (filterConfig !== undefined) updateData.filters = JSON.stringify(filterConfig);

      const filter = await prisma.savedFilter.update({
        where: { id },
        data: updateData
      });

      return res.status(200).json({ filter });
    } catch (error) {
      console.error('Error updating saved filter:', error);
      return res.status(500).json({ message: 'Error updating saved filter', error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.savedFilter.delete({
        where: { id }
      });

      return res.status(200).json({ message: 'Saved filter deleted successfully' });
    } catch (error) {
      console.error('Error deleting saved filter:', error);
      return res.status(500).json({ message: 'Error deleting saved filter', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}

