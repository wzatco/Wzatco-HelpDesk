import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { ticketId, filename } = req.query;
    
    if (!ticketId || !filename) {
      return res.status(400).json({ message: 'Ticket ID and filename are required' });
    }

    // Decode URL-encoded filename (handles spaces, special characters)
    let decodedFilename;
    try {
      decodedFilename = decodeURIComponent(filename);
    } catch (e) {
      // If decoding fails, use original filename
      decodedFilename = filename;
    }
    
    // Security: Validate ticketId (allow alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket ID format' });
    }

    // More permissive filename validation - allow spaces and common characters
    // Allow alphanumeric, spaces, dots, hyphens, underscores, parentheses, and other common filename characters
    // Using a more permissive pattern that allows most printable characters except path separators
    if (decodedFilename.includes('..') || decodedFilename.includes('/') || decodedFilename.includes('\\')) {
      return res.status(400).json({ message: 'Invalid filename: path traversal detected' });
    }
    
    // Allow most characters except path separators and control characters
    if (!/^[\x20-\x7E]+$/.test(decodedFilename)) {
      return res.status(400).json({ message: 'Invalid filename format' });
    }

    // Try multiple filename variations in case of encoding issues
    const possibleFilenames = [
      decodedFilename,                    // Decoded version (with spaces)
      filename,                           // Original (might be URL-encoded)
      filename.replace(/%20/g, ' '),      // Manual space replacement from %20
      filename.replace(/\+/g, ' ')        // Manual space replacement from +
    ].filter((f, i, arr) => arr.indexOf(f) === i); // Remove duplicates
    let filePath = null;
    let foundFilename = null;

    for (const testFilename of possibleFilenames) {
      const testPath = path.join(process.cwd(), 'uploads', 'tickets', ticketId, testFilename);
      
      // Security check: ensure path is within uploads/tickets directory
      const uploadsTicketsDir = path.join(process.cwd(), 'uploads', 'tickets');
      const resolvedPath = path.resolve(testPath);
      const resolvedUploadsTicketsDir = path.resolve(uploadsTicketsDir);
      
      if (!resolvedPath.startsWith(resolvedUploadsTicketsDir)) {
        continue; // Skip this path for security
      }
      
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        foundFilename = testFilename;
        break;
      }
    }
    
    // If file not found, check what files exist in the directory
    if (!filePath) {
      const ticketDir = path.join(process.cwd(), 'uploads', 'tickets', ticketId);
      let existingFiles = [];
      if (fs.existsSync(ticketDir)) {
        try {
          existingFiles = fs.readdirSync(ticketDir);
        } catch (e) {
          console.error('Error reading ticket directory:', e);
        }
      }
      
      console.error('File not found:', {
        ticketId,
        originalFilename: filename,
        decodedFilename,
        triedPaths: possibleFilenames.map(f => path.join('uploads', 'tickets', ticketId, f)),
        existingFiles: existingFiles.slice(0, 10) // Log first 10 files
      });
      
      return res.status(404).json({ 
        message: 'File not found',
        ticketId,
        filename: decodedFilename
      });
    }

    // Read file and determine content type
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(foundFilename).toLowerCase();
    const contentType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed'
    }[ext] || 'application/octet-stream';

    // Set headers and send file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(fileBuffer);
  } catch (error) {
    console.error('Error serving ticket file:', {
      error: error.message,
      stack: error.stack,
      ticketId: req.query?.ticketId,
      filename: req.query?.filename
    });
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}

