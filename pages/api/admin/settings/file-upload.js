import prisma, { ensurePrismaConnected } from '../../../../lib/prisma';

const SETTINGS_KEYS = {
  MAX_UPLOAD_SIZE: 'file_upload_max_size',
  ALLOWED_FILE_TYPES: 'file_upload_allowed_types',
  CLIENT_PHONE_UPLOAD: 'file_upload_client_phone',
  TICKET_FILE_UPLOAD: 'file_upload_ticket'
};

export default async function handler(req, res) {
  // Ensure Prisma is connected before proceeding
  await ensurePrismaConnected();

  if (req.method === 'GET') {
    try {
      // Get all file upload settings
      const settings = await prisma.settings.findMany({
        where: {
          category: 'file_upload'
        }
      });

      // Convert to key-value object
      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });

      // Parse allowed file types if stored as JSON
      let allowedFileTypes = [];
      try {
        if (settingsObj[SETTINGS_KEYS.ALLOWED_FILE_TYPES]) {
          allowedFileTypes = JSON.parse(settingsObj[SETTINGS_KEYS.ALLOWED_FILE_TYPES]);
        }
      } catch (e) {
        console.error('Error parsing allowed file types:', e);
      }

      // Return with defaults if not set
      const result = {
        maxUploadSize: settingsObj[SETTINGS_KEYS.MAX_UPLOAD_SIZE] || '10',
        allowedFileTypes: allowedFileTypes.length > 0 ? allowedFileTypes : [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'video/mp4',
          'video/quicktime',
          'application/zip'
        ],
        clientPhoneUpload: settingsObj[SETTINGS_KEYS.CLIENT_PHONE_UPLOAD] === 'true' || true, // Default to true
        ticketFileUpload: settingsObj[SETTINGS_KEYS.TICKET_FILE_UPLOAD] === 'true' || true // Default to true
      };

      res.status(200).json({ success: true, settings: result });
    } catch (error) {
      console.error('Error fetching file upload settings:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { maxUploadSize, allowedFileTypes, clientPhoneUpload, ticketFileUpload } = req.body;

      // Update or create Max Upload Size
      if (maxUploadSize !== undefined) {
        await prisma.settings.upsert({
          where: { key: SETTINGS_KEYS.MAX_UPLOAD_SIZE },
          update: { 
            value: maxUploadSize.toString(),
            updatedAt: new Date()
          },
          create: {
            key: SETTINGS_KEYS.MAX_UPLOAD_SIZE,
            value: maxUploadSize.toString(),
            description: 'Maximum file upload size in MB',
            category: 'file_upload'
          }
        });
      }

      // Update or create Allowed File Types
      if (allowedFileTypes !== undefined) {
        const allowedFileTypesJson = JSON.stringify(Array.isArray(allowedFileTypes) ? allowedFileTypes : []);
        await prisma.settings.upsert({
          where: { key: SETTINGS_KEYS.ALLOWED_FILE_TYPES },
          update: { 
            value: allowedFileTypesJson,
            updatedAt: new Date()
          },
          create: {
            key: SETTINGS_KEYS.ALLOWED_FILE_TYPES,
            value: allowedFileTypesJson,
            description: 'Allowed file types for uploads (stored as JSON array)',
            category: 'file_upload'
          }
        });
      }

      // Update or create Client Phone Upload setting
      if (clientPhoneUpload !== undefined) {
        await prisma.settings.upsert({
          where: { key: SETTINGS_KEYS.CLIENT_PHONE_UPLOAD },
          update: { 
            value: clientPhoneUpload.toString(),
            updatedAt: new Date()
          },
          create: {
            key: SETTINGS_KEYS.CLIENT_PHONE_UPLOAD,
            value: clientPhoneUpload.toString(),
            description: 'Enable or disable file uploads from client phones',
            category: 'file_upload'
          }
        });
      }

      // Update or create Ticket File Upload setting
      if (ticketFileUpload !== undefined) {
        await prisma.settings.upsert({
          where: { key: SETTINGS_KEYS.TICKET_FILE_UPLOAD },
          update: { 
            value: ticketFileUpload.toString(),
            updatedAt: new Date()
          },
          create: {
            key: SETTINGS_KEYS.TICKET_FILE_UPLOAD,
            value: ticketFileUpload.toString(),
            description: 'Enable or disable file uploads in tickets',
            category: 'file_upload'
          }
        });
      }

      res.status(200).json({ success: true, message: 'File upload settings saved successfully' });
    } catch (error) {
      console.error('Error updating file upload settings:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}

