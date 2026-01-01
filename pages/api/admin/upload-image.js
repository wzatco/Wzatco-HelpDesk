import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { base64, filename, mimeType } = req.body;

    if (!base64) {
      return res.status(400).json({ message: 'Image data is required' });
    }

    // Validate image type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    let detectedMimeType = mimeType;

    // Extract base64 string and mime type from data URL if present
    let base64String;
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

    if (!allowedMimeTypes.includes(detectedMimeType)) {
      return res.status(400).json({ message: 'Only image files are allowed (JPEG, PNG, GIF, WebP, SVG)' });
    }

    // Generate unique filename
    const extension = detectedMimeType.split('/')[1] || 'jpg';
    const sanitizedFilename = filename ? path.basename(filename) : `image_${Date.now()}`;
    const uniqueFilename = `article_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', 'articles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save file
    const filePath = path.join(uploadDir, uniqueFilename);
    const buffer = Buffer.from(base64String, 'base64');
    fs.writeFileSync(filePath, buffer);

    // Generate URL
    const fileUrl = `/api/uploads/articles/${uniqueFilename}`;

    res.status(200).json({
      success: true,
      url: fileUrl,
      filename: uniqueFilename,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

