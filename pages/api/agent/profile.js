import prisma from '../../../lib/prisma';
import { getCurrentAgent } from '../../../lib/utils/agent-auth';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    const agent = await getCurrentAgent(req);

    if (!agent) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      // Fetch agent with relations
      const agentData = await prisma.agent.findUnique({
        where: { id: agent.id },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          role: {
            select: {
              id: true,
              title: true,
              displayAs: true
            }
          },
          account: {
            select: {
              id: true,
              email: true,
              phone: true,
              avatarUrl: true
            }
          }
        }
      });

      if (!agentData) {
        return res.status(404).json({ success: false, error: 'Agent not found' });
      }

      // Return agent profile data with all fields
      return res.status(200).json({
        success: true,
        data: {
          id: agentData.id,
          name: agentData.name,
          email: agentData.email || agentData.account?.email,
          phone: agentData.account?.phone || null,
          slug: agentData.slug,
          avatarUrl: agentData.account?.avatarUrl || null,
          department: agentData.department,
          role: agentData.role,
          isActive: agentData.isActive,
          presenceStatus: agentData.presenceStatus,
          lastSeenAt: agentData.lastSeenAt,
          // New profile fields
          bio: agentData.bio || null,
          jobTitle: agentData.jobTitle || null,
          mobile: agentData.mobile || null,
          extension: agentData.extension || null,
          address: agentData.address || null,
          city: agentData.city || null,
          state: agentData.state || null,
          country: agentData.country || null,
          postal: agentData.postal || null,
          timezone: agentData.timezone || 'Asia/Kolkata',
          language: agentData.language || 'en',
          skills: agentData.skills || null,
          maxLoad: agentData.maxLoad || null
        }
      });
    }

    if (req.method === 'PUT') {
      const {
        name,
        email,
        phone,
        bio,
        jobTitle,
        mobile,
        extension,
        address,
        city,
        state,
        country,
        postal,
        timezone,
        language,
        skills,
        avatarBase64
      } = req.body || {};

      // Build update data for Agent model
      const agentUpdateData = {};
      if (name !== undefined) agentUpdateData.name = name || agent.name;
      if (bio !== undefined) agentUpdateData.bio = bio || null;
      if (jobTitle !== undefined) agentUpdateData.jobTitle = jobTitle || null;
      if (mobile !== undefined) agentUpdateData.mobile = mobile || null;
      if (extension !== undefined) agentUpdateData.extension = extension || null;
      if (address !== undefined) agentUpdateData.address = address || null;
      if (city !== undefined) agentUpdateData.city = city || null;
      if (state !== undefined) agentUpdateData.state = state || null;
      if (country !== undefined) agentUpdateData.country = country || null;
      if (postal !== undefined) agentUpdateData.postal = postal || null;
      if (timezone !== undefined) agentUpdateData.timezone = timezone || 'Asia/Kolkata';
      if (language !== undefined) agentUpdateData.language = language || 'en';
      if (skills !== undefined) {
        // Handle skills: if it's an array, convert to JSON string; if it's already a string, keep it
        agentUpdateData.skills = Array.isArray(skills) 
          ? JSON.stringify(skills) 
          : (typeof skills === 'string' ? skills : null);
      }

      // Handle avatar upload
      let avatarUrl = undefined;
      if (avatarBase64 === null) {
        avatarUrl = null;
      } else if (avatarBase64 && typeof avatarBase64 === 'string' && avatarBase64.startsWith('data:image')) {
        try {
          const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          const mimeMatch = avatarBase64.match(/data:image\/([^;]+);/);
          const ext = mimeMatch ? mimeMatch[1] : 'png';
          const base64Match = avatarBase64.split(',');
          if (base64Match.length < 2) {
            throw new Error('Invalid base64 format');
          }
          const base64Data = base64Match[1];

          const filename = `agent_${agent.id}.${ext}`;
          const filePath = path.join(uploadsDir, filename);
          const buffer = Buffer.from(base64Data, 'base64');
          fs.writeFileSync(filePath, buffer);

          if (!fs.existsSync(filePath)) {
            throw new Error('File write verification failed');
          }

          avatarUrl = `/api/uploads/avatars/${filename}`;
        } catch (uploadError) {
          throw new Error(`Failed to upload avatar: ${uploadError.message}`);
        }
      }

      // Update Agent
      const updatedAgent = await prisma.agent.update({
        where: { id: agent.id },
        data: agentUpdateData,
        include: {
          department: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          role: {
            select: {
              id: true,
              title: true,
              displayAs: true
            }
          },
          account: {
            select: {
              id: true,
              email: true,
              phone: true,
              avatarUrl: true
            }
          }
        }
      });

      // Update User account if phone or avatar changed
      if (agent.accountId) {
        const userUpdateData = {};
        if (phone !== undefined) userUpdateData.phone = phone || null;
        if (email !== undefined) userUpdateData.email = email || agent.account?.email;
        if (avatarUrl !== undefined) userUpdateData.avatarUrl = avatarUrl;

        if (Object.keys(userUpdateData).length > 0) {
          await prisma.user.update({
            where: { id: agent.accountId },
            data: userUpdateData
          });
        }
      }

      // Fetch updated agent with relations
      const finalAgent = await prisma.agent.findUnique({
        where: { id: agent.id },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          role: {
            select: {
              id: true,
              title: true,
              displayAs: true
            }
          },
          account: {
            select: {
              id: true,
              email: true,
              phone: true,
              avatarUrl: true
            }
          }
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          id: finalAgent.id,
          name: finalAgent.name,
          email: finalAgent.email || finalAgent.account?.email,
          phone: finalAgent.account?.phone || null,
          slug: finalAgent.slug,
          avatarUrl: finalAgent.account?.avatarUrl || null,
          department: finalAgent.department,
          role: finalAgent.role,
          isActive: finalAgent.isActive,
          presenceStatus: finalAgent.presenceStatus,
          lastSeenAt: finalAgent.lastSeenAt,
          bio: finalAgent.bio || null,
          jobTitle: finalAgent.jobTitle || null,
          mobile: finalAgent.mobile || null,
          extension: finalAgent.extension || null,
          address: finalAgent.address || null,
          city: finalAgent.city || null,
          state: finalAgent.state || null,
          country: finalAgent.country || null,
          postal: finalAgent.postal || null,
          timezone: finalAgent.timezone || 'Asia/Kolkata',
          language: finalAgent.language || 'en',
          skills: finalAgent.skills || null,
          maxLoad: finalAgent.maxLoad || null
        }
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in agent profile API:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
