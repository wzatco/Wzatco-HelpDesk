import prisma from '@/lib/prisma';
import { generateCustomerId, getNextCustomerSequence, getCategoryCode, getProductCode } from '../../../../lib/customerIdGenerator.js';


/**
 * API endpoint to update existing customer IDs to the new format
 * This should be run once to migrate existing customers
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get all customers
    const customers = await prisma.customer.findMany({
      include: {
        conversations: {
          orderBy: { createdAt: 'asc' },
          take: 1 // Get first ticket to determine category/product
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const updates = [];
    const errors = [];

    for (const customer of customers) {
      try {
        // Get category and product from first ticket, or use defaults
        const firstTicket = customer.conversations[0];
        const category = firstTicket?.category || 'WZATCO';
        const productModel = firstTicket?.productModel || undefined;
        const createdAt = customer.createdAt;

        // Generate new ID
        const newId = await generateCustomerId({
          category,
          productModel,
          createdAt,
          prisma
        });

        // Check if new ID already exists (shouldn't happen, but safety check)
        const existing = await prisma.customer.findUnique({
          where: { id: newId }
        });

        if (existing && existing.id !== customer.id) {
          // ID conflict - manually increment
          const conflictSequence = await getNextCustomerSequence(prisma, category, productModel, createdAt);
          // Manually create ID with incremented sequence
          const year = createdAt.getFullYear().toString().slice(-2);
          const month = String(createdAt.getMonth() + 1).padStart(2, '0');
          const yymm = `${year}${month}`;
          const catCode = getCategoryCode(category);
          const prodCode = getProductCode(productModel);
          const seq = String(conflictSequence + 1).padStart(3, '0');
          const altId = `CUST-${yymm}-${catCode}-${prodCode}-${seq}`;
          updates.push({ oldId: customer.id, newId: altId });
        } else {
          updates.push({ oldId: customer.id, newId });
        }
      } catch (error) {
        errors.push({ customerId: customer.id, error: error.message });
      }
    }

    // Update customers with new IDs
    // Note: SQLite doesn't support updating primary keys directly, so we need to:
    // 1. Create new records with new IDs
    // 2. Update conversations to reference new IDs
    // 3. Delete old records

    let updatedCount = 0;
    let failedCount = 0;

    for (const update of updates) {
      try {
        // Get customer data
        const customer = await prisma.customer.findUnique({
          where: { id: update.oldId },
          include: { conversations: true }
        });

        if (!customer) continue;

        // Create new customer with new ID
        const newCustomer = await prisma.customer.create({
          data: {
            id: update.newId,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            company: customer.company,
            location: customer.location,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt
          }
        });

        // Update all conversations to reference new customer ID
        await prisma.conversation.updateMany({
          where: { customerId: update.oldId },
          data: { customerId: update.newId }
        });

        // Delete old customer record
        await prisma.customer.delete({
          where: { id: update.oldId }
        });

        updatedCount++;
      } catch (error) {
        failedCount++;
        errors.push({ oldId: update.oldId, error: error.message });
      }
    }

    res.status(200).json({
      message: 'Customer ID update completed',
      total: customers.length,
      updated: updatedCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error updating customer IDs:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
  } 
}

