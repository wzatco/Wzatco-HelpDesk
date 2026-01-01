import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id, docId } = req.query;

  if (req.method === 'GET') {
    try {
      const document = await prisma.accessoryDocument.findUnique({
        where: { id: docId }
      });

      if (!document || document.accessoryId !== id) {
        return res.status(404).json({ message: 'Document not found' });
      }

      res.status(200).json({ document });
    } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'PATCH') {
    try {
      const { name, description } = req.body;

      const document = await prisma.accessoryDocument.findUnique({
        where: { id: docId }
      });

      if (!document || document.accessoryId !== id) {
        return res.status(404).json({ message: 'Document not found' });
      }

      const updatedDocument = await prisma.accessoryDocument.update({
        where: { id: docId },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description })
        }
      });

      res.status(200).json({ document: updatedDocument });
    } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'DELETE') {
    try {
      const document = await prisma.accessoryDocument.findUnique({
        where: { id: docId }
      });

      if (!document || document.accessoryId !== id) {
        return res.status(404).json({ message: 'Document not found' });
      }

      // Delete file from filesystem
      try {
        const filePath = path.join(process.cwd(), document.fileUrl.replace('/api/uploads/', 'uploads/'));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileError) {
        console.warn('Error deleting file:', fileError);
        // Continue with database deletion even if file deletion fails
      }

      // Delete from database
      await prisma.accessoryDocument.delete({
        where: { id: docId }
      });

      res.status(200).json({ message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ message: 'Internal server error' });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

