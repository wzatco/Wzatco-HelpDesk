import prisma, { ensurePrismaConnected } from '@/lib/prisma';


export default async function handler(req, res) {
  await ensurePrismaConnected();
  if (req.method === 'GET') {
    try {
      const tags = await prisma.tag.findMany({
        orderBy: { name: 'asc' }
      });
      
      return res.status(200).json({ tags });
    } catch (error) {
      console.error('Error fetching tags:', error);
      return res.status(500).json({ message: 'Error fetching tags', error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, color } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'Tag name is required' });
      }
      
      const tag = await prisma.tag.create({
        data: {
          name: name.trim(),
          color: color || '#8b5cf6'
        }
      });
      
      return res.status(201).json({ tag });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(400).json({ message: 'Tag with this name already exists' });
      }
      console.error('Error creating tag:', error);
      return res.status(500).json({ message: 'Error creating tag', error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: `Method ${req.method} not allowed` });
  }
}

