import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';


export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Increase body size limit to 50MB for documents
    },
  },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { base64, filename, mimeType, productId, name, description, uploadedBy } = req.body;

    if (!base64 || !productId || !name) {
      return res.status(400).json({ message: 'base64, productId, and name are required' });
    }

    let base64String;
    let detectedMimeType;
    let detectedFilename;

    // Handle base64 data
    if (base64.includes(',')) {
      const parts = base64.split(',');
      base64String = parts[1];
      const dataUrlMatch = parts[0].match(/^data:([A-Za-z-+\/]+);base64$/);
      if (dataUrlMatch) {
        detectedMimeType = dataUrlMatch[1];
      }
    } else {
      base64String = base64;
    }
    
    detectedMimeType = mimeType || detectedMimeType || 'application/octet-stream';
    detectedFilename = filename || `document_${Date.now()}`;

    // Determine file type category
    let fileType = 'other';
    if (detectedMimeType.startsWith('image/')) {
      fileType = 'image';
    } else if (detectedMimeType.includes('pdf')) {
      fileType = 'pdf';
    } else if (detectedMimeType.includes('video')) {
      fileType = 'video';
    } else if (detectedMimeType.includes('word') || detectedMimeType.includes('document')) {
      fileType = 'document';
    } else if (detectedMimeType.includes('spreadsheet') || detectedMimeType.includes('excel')) {
      fileType = 'spreadsheet';
    }

    // Get file extension
    const extension = detectedFilename.split('.').pop() || detectedMimeType.split('/')[1] || 'bin';
    
    // Generate unique filename
    const sanitizedFilename = path.basename(detectedFilename).replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `${productId}_${Date.now()}_${sanitizedFilename.replace(/\.[^/.]+$/, '')}.${extension}`;
    
    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', 'products', 'documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save file
    const filePath = path.join(uploadDir, uniqueFilename);
    const buffer = Buffer.from(base64String, 'base64');
    fs.writeFileSync(filePath, buffer);

    // Get file size
    const fileSize = buffer.length;

    // Generate URL
    const fileUrl = `/api/uploads/products/documents/${uniqueFilename}`;

    // Create document record in database
    const document = await prisma.productDocument.create({
      data: {
        productId,
        name,
        description: description || null,
        fileUrl,
        fileType,
        fileSize,
        uploadedBy: uploadedBy || null
      }
    });

    res.status(200).json({ 
      success: true,
      document,
      message: 'Document uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ message: 'Failed to upload document', error: error.message });
  } 
}

