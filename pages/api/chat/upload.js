import fs from 'fs';
import path from 'path';
import { IncomingForm } from 'formidable';

// Disable default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Parse form data using formidable
    const form = new IncomingForm({
      uploadDir: uploadsDir,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB max
      multiples: false,
    });

    const [fields, files] = await form.parse(req);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.originalFilename || 'file';
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const uniqueFilename = `${timestamp}_${baseName}${ext}`;
    const newPath = path.join(uploadsDir, uniqueFilename);

    // Move file to final location
    fs.renameSync(file.filepath, newPath);

    // Determine file type
    const mimeType = file.mimetype || 'application/octet-stream';
    let type = 'file';
    if (mimeType.startsWith('image/')) {
      type = 'image';
    } else if (mimeType.startsWith('video/')) {
      type = 'video';
    }

    // Return file info
    const fileUrl = `/uploads/${uniqueFilename}`;
    
    res.status(200).json({
      success: true,
      attachment: {
        type,
        url: fileUrl,
        fileName: originalName,
        mimeType,
        size: file.size,
      },
    });
  } catch (error) {
    console.error('File upload error:', error);
    
    // Handle file size exceeded error specifically
    if (error.code === 1009 || error.message.includes('exceeded')) {
      return res.status(413).json({ 
        error: 'File size exceeded',
        message: 'The file size exceeds the maximum allowed limit of 50 MB.'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to upload file',
      message: error.message 
    });
  }
}

