import prisma from '@/lib/prisma';

const prisma = new PrismaClient();

// Define all available pages/permissions
const AVAILABLE_PAGES = [
  { name: 'admin.dashboard', label: 'Admin Dashboard', category: '01. Admin Report' },
  { name: 'admin.tickets', label: 'Tickets', category: '01. Admin Report' },
  { name: 'admin.tickets.create', label: 'Create Ticket', category: '01. Admin Report' },
  { name: 'admin.tickets.edit', label: 'Edit Ticket', category: '01. Admin Report' },
  { name: 'admin.tickets.delete', label: 'Delete Ticket', category: '01. Admin Report' },
  { name: 'admin.agents', label: 'Agents', category: '01. Admin Report' },
  { name: 'admin.agents.create', label: 'Create Agent', category: '01. Admin Report' },
  { name: 'admin.agents.edit', label: 'Edit Agent', category: '01. Admin Report' },
  { name: 'admin.agents.delete', label: 'Delete Agent', category: '01. Admin Report' },
  { name: 'admin.departments', label: 'Departments', category: '01. Admin Report' },
  { name: 'admin.products', label: 'Products', category: '01. Admin Report' },
  { name: 'admin.knowledge-base', label: 'Knowledge Base', category: '01. Admin Report' },
  { name: 'admin.reports', label: 'Reports', category: '01. Admin Report' },
  { name: 'admin.reports.overview', label: 'Reports Overview', category: '01. Admin Report' },
  { name: 'admin.reports.performance', label: 'Performance Reports', category: '01. Admin Report' },
  { name: 'admin.reports.sla', label: 'SLA Reports', category: '01. Admin Report' },
  { name: 'admin.reports.agents', label: 'Agent Reports', category: '01. Admin Report' },
  { name: 'admin.reports.customers', label: 'Customer Reports', category: '01. Admin Report' },
  { name: 'admin.widgets', label: 'Widgets', category: '01. Admin Report' },
  { name: 'admin.integrations', label: 'Integrations', category: '01. Admin Report' },
  { name: 'admin.ticket-templates', label: 'Ticket Templates', category: '01. Admin Report' },
  { name: 'admin.escalation-rules', label: 'Escalation Rules', category: '01. Admin Report' },
  { name: 'admin.settings', label: 'General Settings', category: '02. Admin Setting' },
  { name: 'admin.settings.basic', label: 'Basic Settings', category: '02. Admin Setting' },
  { name: 'admin.settings.ai', label: 'AI Settings', category: '02. Admin Setting' },
  { name: 'admin.settings.file-upload', label: 'File Upload Settings', category: '02. Admin Setting' },
  { name: 'admin.settings.ticket', label: 'Ticket Settings', category: '02. Admin Setting' },
  { name: 'admin.settings.notification', label: 'Notification Settings', category: '02. Admin Setting' },
  { name: 'admin.settings.security', label: 'Security Settings', category: '02. Admin Setting' },
  { name: 'admin.settings.email', label: 'Email Settings', category: '02. Admin Setting' },
  { name: 'admin.roles', label: 'Role List', category: '02. Admin Setting' },
  { name: 'admin.roles.create', label: 'Create Role', category: '02. Admin Setting' },
  { name: 'admin.roles.edit', label: 'Edit Role', category: '02. Admin Setting' },
  { name: 'admin.roles.delete', label: 'Delete Role', category: '02. Admin Setting' }
];

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      // Check if role exists
      const role = await prisma.role.findUnique({
        where: { id }
      });

      if (!role) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }

      // Get all permissions for this role
      const permissions = await prisma.rolePermission.findMany({
        where: { roleId: id }
      });

      // Create a map of existing permissions
      const permissionMap = {};
      permissions.forEach(perm => {
        permissionMap[perm.pageName] = perm.hasAccess;
      });

      // Build response with all pages and their access status
      const pagesWithAccess = AVAILABLE_PAGES.map(page => ({
        pageName: page.name,
        label: page.label,
        category: page.category,
        hasAccess: permissionMap[page.name] || false
      }));

      res.status(200).json({ 
        success: true, 
        role,
        pages: pagesWithAccess,
        categories: [...new Set(AVAILABLE_PAGES.map(p => p.category))].sort()
      });
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    } finally {
      await prisma.$disconnect();
    }
  } else if (req.method === 'POST' || req.method === 'PATCH') {
    try {
      const { permissions } = req.body; // Array of { pageName, hasAccess }

      if (!Array.isArray(permissions)) {
        return res.status(400).json({ success: false, message: 'Permissions must be an array' });
      }

      // Check if role exists
      const role = await prisma.role.findUnique({
        where: { id }
      });

      if (!role) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }

      // If role has super power, grant all permissions
      if (role.hasSuperPower) {
        // Update all permissions to true
        const allPages = AVAILABLE_PAGES.map(p => p.name);
        await Promise.all(
          allPages.map(pageName =>
            prisma.rolePermission.upsert({
              where: {
                roleId_pageName: {
                  roleId: id,
                  pageName
                }
              },
              update: { hasAccess: true },
              create: {
                roleId: id,
                pageName,
                hasAccess: true
              }
            })
          )
        );

        return res.status(200).json({ 
          success: true, 
          message: 'Permissions updated (Super Admin has all access)' 
        });
      }

      // Update permissions
      await Promise.all(
        permissions.map(({ pageName, hasAccess }) =>
          prisma.rolePermission.upsert({
            where: {
              roleId_pageName: {
                roleId: id,
                pageName
              }
            },
            update: { hasAccess },
            create: {
              roleId: id,
              pageName,
              hasAccess
            }
          })
        )
      );

      res.status(200).json({ success: true, message: 'Permissions updated successfully' });
    } catch (error) {
      console.error('Error updating role permissions:', error);
      res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
    res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
  }
}

