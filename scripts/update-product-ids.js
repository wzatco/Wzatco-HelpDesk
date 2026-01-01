/**
 * Script to update existing Product IDs to meaningful format
 * Format: PROD-{CATEGORY}-{NAME_SLUG}
 * 
 * Run with: node scripts/update-product-ids.js
 */

import { PrismaClient } from '@prisma/client';
import { generateProductId } from '../lib/productIdGenerator.js';

const prisma = new PrismaClient();

async function updateProductIds() {
  try {
    console.log('Starting Product ID update...\n');

    // Fetch all products
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`Found ${products.length} products to update.\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const product of products) {
      try {
        // Generate new meaningful ID
        const newId = await generateProductId({
          name: product.name,
          category: product.category || null,
          prisma
        });

        // Skip if ID is already in the correct format
        if (product.id === newId) {
          console.log(`✓ Skipped: ${product.name} (already has correct ID)`);
          skipped++;
          continue;
        }

        // Check if new ID already exists (shouldn't happen, but just in case)
        const existing = await prisma.product.findUnique({
          where: { id: newId }
        });

        if (existing && existing.id !== product.id) {
          console.log(`⚠ Skipped: ${product.name} (new ID ${newId} already exists)`);
          skipped++;
          continue;
        }

        // Update product with new ID
        // Note: We need to handle foreign key constraints
        // First, update any related records if needed
        // For now, we'll use update with a temporary ID, then rename
        
        // Create temporary unique ID
        const tempId = `${newId}-temp-${Date.now()}`;
        
        // Update to temporary ID first
        await prisma.product.update({
          where: { id: product.id },
          data: { id: tempId }
        });

        // Then update to final ID
        await prisma.product.update({
          where: { id: tempId },
          data: { id: newId }
        });

        console.log(`✓ Updated: ${product.name}`);
        console.log(`  Old ID: ${product.id}`);
        console.log(`  New ID: ${newId}\n`);
        updated++;

      } catch (error) {
        console.error(`✗ Error updating ${product.name}:`, error.message);
        errors++;
      }
    }

    console.log('\n=== Update Summary ===');
    console.log(`Total products: ${products.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateProductIds()
  .then(() => {
    console.log('\nProduct ID update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

