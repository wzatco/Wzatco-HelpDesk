import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { filename } = req.query;
    
    // Security: Only allow alphanumeric, underscore, dash, and dot
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      return res.status(400).json({ message: 'Invalid filename' });
    }

    const filePath = path.join(process.cwd(), 'uploads', 'avatars', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Read file and determine content type
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    }[ext] || 'application/octet-stream';

    // Set headers and send file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(fileBuffer);
  } catch (error) {
    console.error('Error serving avatar:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

