import prisma from '@/lib/prisma';
import { z } from 'zod';
import { getCurrentUserId } from '@/lib/auth';
import { checkPermissionOrFail } from '@/lib/permissions';

// Use singleton pattern for Prisma client
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Zod schema for macro validation
const createMacroSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  content: z.string().min(1, 'Content is required'),
  shortcut: z.string().max(50, 'Shortcut must be less than 50 characters').optional().nullable(),
  category: z.string().max(100, 'Category must be less than 100 characters').optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

const updateMacroSchema = createMacroSchema.partial();

export default async function handler(req, res) {
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

    if (req.method === 'GET') {
      try {
        const { category, activeOnly } = req.query;
        
        const where = {};
        
        if (activeOnly === 'true') {
          where.isActive = true;
        }
        
        if (category) {
          where.category = category;
        }

        const macros = await prisma.macro.findMany({
          where,
          orderBy: [
            { category: 'asc' },
            { name: 'asc' }
          ]
        });

        return res.status(200).json({ 
          success: true, 
          data: macros 
        });
      } catch (error) {
        console.error('[Macros API] Error fetching macros:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to fetch macros',
          message: error.message 
        });
      }
    }

    if (req.method === 'POST') {
      try {
        // Validate request body
        const validationResult = createMacroSchema.safeParse(req.body);
        
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

        const { name, content, category, shortcut, isActive } = validationResult.data;

        // Check for duplicate shortcut if provided
        if (shortcut) {
          const existingMacro = await prisma.macro.findUnique({
            where: { shortcut }
          });
          
          if (existingMacro) {
            return res.status(409).json({ 
              success: false, 
              error: 'Duplicate shortcut',
              message: 'A macro with this shortcut already exists' 
            });
          }
        }

        // Create macro
        const macro = await prisma.macro.create({
          data: {
            name: name.trim(),
            content: content.trim(),
            category: category?.trim() || null,
            shortcut: shortcut?.trim() || null,
            isActive: isActive !== undefined ? isActive : true,
          }
        });

        return res.status(201).json({ 
          success: true, 
          data: macro,
          message: 'Macro created successfully' 
        });
      } catch (error) {
        console.error('[Macros API] Error creating macro:', error);
        
        if (error.code === 'P2002') {
          return res.status(409).json({ 
            success: false, 
            error: 'Duplicate entry',
            message: 'A macro with this shortcut already exists' 
          });
        }
        
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to create macro',
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

