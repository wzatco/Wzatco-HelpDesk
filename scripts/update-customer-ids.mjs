/**
 * Script to update existing customer IDs to the new formatted format
 * Run with: node scripts/update-customer-ids.mjs
 * 
 * Note: This uses ES modules (.mjs extension)
 */

import { PrismaClient } from '@prisma/client';
import { generateCustomerId, getNextCustomerSequence, getCategoryCode, getProductCode } from '../lib/customerIdGenerator.js';

const prisma = new PrismaClient();

async function updateCustomerIds() {
  try {
    console.log('Starting customer ID update...');
    
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

    console.log(`Found ${customers.length} customers to update`);

    const updates = [];
    const errors = [];

    // Group customers by category/product/date to assign sequential numbers
    const customerGroups = new Map();
    
    // Prepare updates - group by category/product/date
    for (const customer of customers) {
      try {
        // Skip if already in new format
        if (customer.id.startsWith('CUST-')) {
          console.log(`Skipping ${customer.id} - already in new format`);
          continue;
        }

        // Get category and product from first ticket, or use defaults
        const firstTicket = customer.conversations[0];
        const category = firstTicket?.category || 'WZATCO';
        const productModel = firstTicket?.productModel || undefined;
        const createdAt = customer.createdAt;

        // Create group key
        const year = createdAt.getFullYear().toString().slice(-2);
        const month = String(createdAt.getMonth() + 1).padStart(2, '0');
        const yymm = `${year}${month}`;
        const catCode = getCategoryCode(category);
        const prodCode = getProductCode(productModel);
        const groupKey = `${yymm}-${catCode}-${prodCode}`;

        if (!customerGroups.has(groupKey)) {
          customerGroups.set(groupKey, []);
        }
        customerGroups.get(groupKey).push({ customer, category, productModel, createdAt });
      } catch (error) {
        errors.push({ customerId: customer.id, error: error.message });
        console.error(`Error processing customer ${customer.id}:`, error.message);
      }
    }

    // Generate IDs for each group with proper sequencing
    for (const [groupKey, groupCustomers] of customerGroups.entries()) {
      // Sort by creation date to maintain order
      groupCustomers.sort((a, b) => a.customer.createdAt - b.customer.createdAt);
      
      // Get base sequence for this group
      const firstCustomer = groupCustomers[0];
      let baseSequence = await getNextCustomerSequence(
        prisma, 
        firstCustomer.category, 
        firstCustomer.productModel, 
        firstCustomer.createdAt
      );

      // Generate IDs for all customers in this group
      for (let i = 0; i < groupCustomers.length; i++) {
        const { customer, category, productModel, createdAt } = groupCustomers[i];
        const sequence = baseSequence + i;
        
        const year = createdAt.getFullYear().toString().slice(-2);
        const month = String(createdAt.getMonth() + 1).padStart(2, '0');
        const yymm = `${year}${month}`;
        const catCode = getCategoryCode(category);
        const prodCode = getProductCode(productModel);
        const seq = String(sequence).padStart(3, '0');
        const newId = `CUST-${yymm}-${catCode}-${prodCode}-${seq}`;

        // Check if new ID already exists
        const existing = await prisma.customer.findUnique({
          where: { id: newId }
        });

        if (existing && existing.id !== customer.id) {
          // ID conflict - increment further
          const conflictSequence = await getNextCustomerSequence(prisma, category, productModel, createdAt);
          const altSeq = String(conflictSequence + 1).padStart(3, '0');
          const altId = `CUST-${yymm}-${catCode}-${prodCode}-${altSeq}`;
          updates.push({ oldId: customer.id, newId: altId, customer });
        } else {
          updates.push({ oldId: customer.id, newId, customer });
        }
      }
    }

    console.log(`Prepared ${updates.length} updates, ${errors.length} errors`);

    // Execute updates
    let updatedCount = 0;
    let failedCount = 0;

    for (const update of updates) {
      try {
        const { customer } = update;

        // Check if new ID already exists
        const existingNewId = await prisma.customer.findUnique({
          where: { id: update.newId }
        });

        if (existingNewId) {
          console.log(`⚠ Skipping ${update.oldId} - new ID ${update.newId} already exists`);
          continue;
        }

        // Temporarily clear email from old customer to avoid unique constraint conflict
        const originalEmail = customer.email;
        if (originalEmail) {
          await prisma.customer.update({
            where: { id: update.oldId },
            data: { email: null }
          });
        }

        // Create new customer with new ID and original email
        const newCustomer = await prisma.customer.create({
          data: {
            id: update.newId,
            name: customer.name,
            email: originalEmail,
            phone: customer.phone,
            company: customer.company,
            location: customer.location,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt
          }
        });

        // Update all conversations to reference new customer ID
        const conversationUpdate = await prisma.conversation.updateMany({
          where: { customerId: update.oldId },
          data: { customerId: update.newId }
        });

        // Delete old customer record
        await prisma.customer.delete({
          where: { id: update.oldId }
        });

        updatedCount++;
        console.log(`✓ Updated ${update.oldId} → ${update.newId} (${conversationUpdate.count} conversations)`);
      } catch (error) {
        failedCount++;
        errors.push({ oldId: update.oldId, error: error.message });
        console.error(`✗ Failed to update ${update.oldId}:`, error.message);
      }
    }

    console.log('\n=== Update Summary ===');
    console.log(`Total customers: ${customers.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Failed: ${failedCount}`);
    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(err => console.log(`  - ${err.customerId || err.oldId}: ${err.error}`));
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run
updateCustomerIds()
  .then(() => {
    console.log('\n✅ Update completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  });

