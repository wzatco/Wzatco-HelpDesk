import prisma, { ensurePrismaConnected } from '@/lib/prisma';


export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const documents = await prisma.productDocument.findMany({
        where: { productId: id },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json({ documents });
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'POST') {
    try {
      const { name, description, fileUrl, fileType, fileSize, uploadedBy } = req.body;

      if (!name || !fileUrl) {
        return res.status(400).json({ message: 'Name and fileUrl are required' });
      }

      const document = await prisma.productDocument.create({
        data: {
          productId: id,
          name,
          description: description || null,
          fileUrl,
          fileType: fileType || 'other',
          fileSize: fileSize || null,
          uploadedBy: uploadedBy || null
        }
      });

      res.status(201).json({ document });
    } catch (error) {
      console.error('Error creating document:', error);
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

