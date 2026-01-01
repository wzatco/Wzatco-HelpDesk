import prisma, { ensurePrismaConnected } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';


export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Increase body size limit to 10MB
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Support both old format (file) and new format (base64, filename, mimeType)
    const { file, base64, filename, mimeType, type, id, entityId } = req.body;

    if (!type) {
      return res.status(400).json({ message: 'Type is required' });
    }

    // Validate type
    if (!['product', 'accessory'].includes(type)) {
      return res.status(400).json({ message: 'Type must be "product" or "accessory"' });
    }

    let base64String;
    let detectedMimeType;
    let detectedFilename;

    // Handle new format (base64, filename, mimeType)
    if (base64) {
      // Check if base64 includes data URL prefix
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
      
      detectedMimeType = mimeType || detectedMimeType || 'image/jpeg';
      detectedFilename = filename || `image_${Date.now()}.${detectedMimeType.split('/')[1] || 'jpg'}`;
    } 
    // Handle old format (file as base64 data URL)
    else if (file) {
      const matches = file.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ message: 'Invalid base64 file format' });
      }

      detectedMimeType = matches[1];
      base64String = matches[2];
      detectedFilename = filename || `image_${Date.now()}.${detectedMimeType.split('/')[1] || 'jpg'}`;
    } else {
      return res.status(400).json({ message: 'File data (base64 or file) is required' });
    }

    // Validate image type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(detectedMimeType)) {
      return res.status(400).json({ message: 'Only image files are allowed (JPEG, PNG, GIF, WebP)' });
    }

    // Generate filename with entity ID if provided
    const entityIdToUse = id || entityId;
    const extension = detectedMimeType.split('/')[1] || 'jpg';
    const sanitizedFilename = detectedFilename ? path.basename(detectedFilename) : `image_${Date.now()}`;
    const uniqueFilename = entityIdToUse 
      ? `${entityIdToUse}_${Date.now()}_${sanitizedFilename.replace(/\.[^/.]+$/, '')}.${extension}`
      : `${type}_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
    
    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', type);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save file
    const filePath = path.join(uploadDir, uniqueFilename);
    const buffer = Buffer.from(base64String, 'base64');
    fs.writeFileSync(filePath, buffer);

    // Generate URL
    const fileUrl = `/api/uploads/${type}/${uniqueFilename}`;

    // If entityId is provided and it's not 'temp', update the entity with the image URL
    // 'temp' is used for new entities that don't exist yet
    if (entityIdToUse && entityIdToUse !== 'temp') {
      try {
        if (type === 'product') {
          // Check if product exists before updating
          const product = await prisma.product.findUnique({
            where: { id: entityIdToUse }
          });
          if (product) {
            await prisma.product.update({
              where: { id: entityIdToUse },
              data: { imageUrl: fileUrl }
            });
          }
        } else if (type === 'accessory') {
          // Check if accessory exists before updating
          const accessory = await prisma.accessory.findUnique({
            where: { id: entityIdToUse }
          });
          if (accessory) {
            await prisma.accessory.update({
              where: { id: entityIdToUse },
              data: { imageUrl: fileUrl }
            });
          }
        }
      } catch (error) {
        // Log error but don't fail the upload - the image is already saved
        // The entity will be updated when the form is submitted
        console.warn('Could not update entity with image URL:', error.message);
      }
    }

    res.status(200).json({ 
      success: true,
      url: fileUrl,
      filename,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Failed to upload image', error: error.message });
  } finally {
    await prisma.$disconnect();
  }
}

