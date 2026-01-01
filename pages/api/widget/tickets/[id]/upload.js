// Widget API - Upload files for ticket messages
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

// Prisma singleton pattern
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { id: ticketId } = req.query;

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message: 'Ticket ID is required'
      });
    }

    // Verify ticket exists
    const ticket = await prisma.conversation.findUnique({
      where: { ticketNumber: ticketId }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // For now, return mock file URLs
    // In production, you would upload to cloud storage (S3, Cloudinary, etc.)
    const uploadedFiles = [];
    
    // Note: In a real implementation, you would:
    // 1. Parse multipart/form-data
    // 2. Upload files to cloud storage
    // 3. Save file metadata to database
    // 4. Return file URLs

    // Mock response for now
    res.status(200).json({
      success: true,
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading files'
    });
  }
}

