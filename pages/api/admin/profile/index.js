import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  // Add CORS headers if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('API Request received:', req.method, 'URL:', req.url);
    
    // Check if body exists
    if (req.method === 'PUT' && !req.body) {
      console.error('PUT request received but body is empty');
      return res.status(400).json({ message: 'Request body is required' });
    }
    if (req.method === 'GET') {
      const admin = await prisma.admin.upsert({
        where: { email: 'admin@wzatco.com' },
        update: {},
        create: {
          name: 'Admin',
          email: 'admin@wzatco.com'
        }
      });
      return res.status(200).json({ data: admin });
    }

    if (req.method === 'PUT') {
      console.log('PUT request received, body size:', JSON.stringify(req.body).length);
      
      const {
        name,
        email,
        phone,
        role,
        bio,
        address,
        city,
        state,
        country,
        postal,
        timezone,
        notifyEmail,
        notifyPush,
        avatarBase64
      } = req.body || {};
      
      console.log('Parsed body, avatarBase64 present:', !!avatarBase64, avatarBase64 ? `length: ${avatarBase64.length}` : '');

      // Ensure a record exists (by default email)
      const targetEmail = email || 'admin@wzatco.com';
      let admin = await prisma.admin.findFirst({ where: { email: targetEmail } });
      if (!admin) {
        admin = await prisma.admin.create({ 
          data: { 
            name: name || 'Admin', 
            email: targetEmail 
          } 
        });
      }

      let avatarUrl = undefined; // Track if avatar should be updated
      // Handle avatar removal: if avatarBase64 is explicitly null, clear the avatar
      if (avatarBase64 === null) {
        avatarUrl = null;
      } else if (avatarBase64 && typeof avatarBase64 === 'string' && avatarBase64.startsWith('data:image')) {
        try {
          const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          
          // Extract file extension
          const mimeMatch = avatarBase64.match(/data:image\/([^;]+);/);
          const ext = mimeMatch ? mimeMatch[1] : 'png';
          
          // Extract base64 data
          const base64Match = avatarBase64.split(',');
          if (base64Match.length < 2) {
            throw new Error('Invalid base64 format');
          }
          const base64Data = base64Match[1];
          
          if (!base64Data || base64Data.length === 0) {
            throw new Error('Empty base64 data');
          }
          
          // Create unique filename
          const filename = `admin_${admin.id}.${ext}`;
          const filePath = path.join(uploadsDir, filename);
          
          // Write file
          const buffer = Buffer.from(base64Data, 'base64');
          fs.writeFileSync(filePath, buffer);
          
          // Verify file was written
          if (!fs.existsSync(filePath)) {
            throw new Error('File write verification failed');
          }
          
          avatarUrl = `/api/uploads/avatars/${filename}`;
          console.log('Avatar uploaded successfully:', avatarUrl);
        } catch (uploadError) {
          console.error('Avatar upload error:', uploadError);
          console.error('Error stack:', uploadError.stack);
          // Re-throw the error so the API returns a proper error response
          throw new Error(`Failed to upload avatar: ${uploadError.message}`);
        }
      }
      // If avatarUrl is undefined, don't update it (keep existing)

      // Build update data - allow empty strings to clear fields
      const updateData = {};
      if (name !== undefined) updateData.name = name || 'Admin';
      if (email !== undefined) updateData.email = email || targetEmail;
      if (phone !== undefined) updateData.phone = phone || null;
      if (role !== undefined) updateData.role = role || 'Admin';
      if (bio !== undefined) updateData.bio = bio || null;
      if (address !== undefined) updateData.address = address || null;
      if (city !== undefined) updateData.city = city || null;
      if (state !== undefined) updateData.state = state || null;
      if (country !== undefined) updateData.country = country || null;
      if (postal !== undefined) updateData.postal = postal || null;
      if (timezone !== undefined) updateData.timezone = timezone || 'Asia/Kolkata';
      if (notifyEmail !== undefined) updateData.notifyEmail = !!notifyEmail;
      if (notifyPush !== undefined) updateData.notifyPush = !!notifyPush;
      // Only update avatarUrl if it was explicitly set (either new upload or removal)
      if (avatarUrl !== undefined) {
        updateData.avatarUrl = avatarUrl;
        console.log('Updating avatarUrl to:', avatarUrl);
      }

      console.log('Update data:', JSON.stringify(updateData, null, 2));
      
      const updated = await prisma.admin.update({
        where: { id: admin.id },
        data: updateData
      });
      
      console.log('Profile updated successfully, avatarUrl:', updated.avatarUrl);
      return res.status(200).json({ data: updated });
    }

    if (req.method === 'DELETE') {
      // Soft reset: clear optional fields, keep record
      const admin = await prisma.admin.findFirst({ where: { email: 'admin@wzatco.com' } });
      if (!admin) return res.status(404).json({ message: 'Not found' });
      const cleared = await prisma.admin.update({
        where: { id: admin.id },
        data: {
          phone: null,
          role: 'Admin',
          bio: null,
          address: null,
          city: null,
          state: null,
          country: null,
          postal: null,
          timezone: 'Asia/Kolkata',
          notifyEmail: true,
          notifyPush: true,
          avatarUrl: null
        }
      });
      return res.status(200).json({ data: cleared });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('admin profile api error', err);
    // Return more specific error message
    const errorMessage = err.message || 'Internal server error';
    return res.status(500).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } 
}


