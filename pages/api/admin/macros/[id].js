import prisma from '@/lib/prisma';
import { z } from 'zod';
import { getCurrentUserId } from '@/lib/auth';
import { checkPermissionOrFail } from '@/lib/permissions';



// Zod schema for macro update validation
const updateMacroSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  shortcut: z.string().max(50, 'Shortcut must be less than 50 characters').optional().nullable(),
  category: z.string().max(100, 'Category must be less than 100 characters').optional().nullable(),
  isActive: z.boolean().optional(),
}).partial();

export default async function handler(req, res) {
  await ensurePrismaConnected();
  try {
    const userId = getCurrentUserId(req);

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized',
        message: 'Please log in to access this resource' 
      });
    }

    // Check permission
    const hasAccess = await checkPermissionOrFail(userId, 'admin.tickets', res);
    if (!hasAccess) {
      return; // checkPermissionOrFail already sent the response
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid ID',
        message: 'Macro ID is required' 
      });
    }

    if (req.method === 'GET') {
      try {
        const macro = await prisma.macro.findUnique({
          where: { id }
        });

        if (!macro) {
          return res.status(404).json({ 
            success: false, 
            error: 'Not found',
            message: 'Macro not found' 
          });
        }

        return res.status(200).json({ 
          success: true, 
          data: macro 
        });
      } catch (error) {
        console.error('[Macros API] Error fetching macro:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to fetch macro',
          message: error.message 
        });
      }
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      try {
        // Validate request body
        const validationResult = updateMacroSchema.safeParse(req.body);
        
        if (!validationResult.success) {
          const errors = validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }));
          
          return res.status(400).json({ 
            success: false, 
            error: 'Validation failed',
            message: errors[0]?.message || 'Invalid input data',
            errors 
          });
        }

        // Check if macro exists
        const existingMacro = await prisma.macro.findUnique({
          where: { id }
        });

        if (!existingMacro) {
          return res.status(404).json({ 
            success: false, 
            error: 'Not found',
            message: 'Macro not found' 
          });
        }

        const updateData = {};
        if (validationResult.data.name !== undefined) {
          updateData.name = validationResult.data.name.trim();
        }
        if (validationResult.data.content !== undefined) {
          updateData.content = validationResult.data.content.trim();
        }
        if (validationResult.data.category !== undefined) {
          updateData.category = validationResult.data.category?.trim() || null;
        }
        if (validationResult.data.shortcut !== undefined) {
          updateData.shortcut = validationResult.data.shortcut?.trim() || null;
        }
        if (validationResult.data.isActive !== undefined) {
          updateData.isActive = validationResult.data.isActive;
        }

        // Check for duplicate shortcut if being updated
        if (updateData.shortcut && updateData.shortcut !== existingMacro.shortcut) {
          const duplicateMacro = await prisma.macro.findUnique({
            where: { shortcut: updateData.shortcut }
          });
          
          if (duplicateMacro) {
            return res.status(409).json({ 
              success: false, 
              error: 'Duplicate shortcut',
              message: 'A macro with this shortcut already exists' 
            });
          }
        }

        // Update macro
        const macro = await prisma.macro.update({
          where: { id },
          data: updateData
        });

        return res.status(200).json({ 
          success: true, 
          data: macro,
          message: 'Macro updated successfully' 
        });
      } catch (error) {
        console.error('[Macros API] Error updating macro:', error);
        
        if (error.code === 'P2025') {
          return res.status(404).json({ 
            success: false, 
            error: 'Not found',
            message: 'Macro not found' 
          });
        }
        
        if (error.code === 'P2002') {
          return res.status(409).json({ 
            success: false, 
            error: 'Duplicate entry',
            message: 'A macro with this shortcut already exists' 
          });
        }
        
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to update macro',
          message: error.message 
        });
      }
    }

    if (req.method === 'DELETE') {
      try {
        // Check if macro exists
        const existingMacro = await prisma.macro.findUnique({
          where: { id }
        });

        if (!existingMacro) {
          return res.status(404).json({ 
            success: false, 
            error: 'Not found',
            message: 'Macro not found' 
          });
        }

        await prisma.macro.delete({
          where: { id }
        });

        return res.status(200).json({ 
          success: true, 
          message: 'Macro deleted successfully' 
        });
      } catch (error) {
        console.error('[Macros API] Error deleting macro:', error);
        
        if (error.code === 'P2025') {
          return res.status(404).json({ 
            success: false, 
            error: 'Not found',
            message: 'Macro not found' 
          });
        }
        
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to delete macro',
          message: error.message 
        });
      }
    }

    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed',
      message: `Method ${req.method} is not allowed` 
    });
  } catch (error) {
    console.error('[Macros API] Unhandled error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred' 
    });
  }
}

