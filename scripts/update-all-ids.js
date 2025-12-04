/**
 * Script to update existing Product and Accessory IDs to meaningful format
 * 
 * Product Format: PROD-{CATEGORY}-{NAME_SLUG}
 * Accessory Format: ACC-{PRODUCT_CODE}-{NAME_SLUG}
 * 
 * Run with: node scripts/update-all-ids.js
 */

import { PrismaClient } from '@prisma/client';
import { generateProductId } from '../lib/productIdGenerator.js';
import { generateAccessoryId } from '../lib/accessoryIdGenerator.js';

const prisma = new PrismaClient();

async function updateAllIds() {
  try {
    console.log('Starting Product and Accessory ID update...\n');

    // First, update all products
    console.log('=== Updating Products ===\n');
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: {
        accessories: true
      }
    });

    console.log(`Found ${products.length} products to update.\n`);

    let productsUpdated = 0;
    let productsSkipped = 0;
    let productsErrors = 0;

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
          productsSkipped++;
          continue;
        }

        // Check if new ID already exists (shouldn't happen, but just in case)
        const existing = await prisma.product.findUnique({
          where: { id: newId }
        });

        if (existing && existing.id !== product.id) {
          console.log(`⚠ Skipped: ${product.name} (new ID ${newId} already exists)`);
          productsSkipped++;
          continue;
        }

        // Update product with new ID
        // Use temporary ID to avoid conflicts
        const tempId = `${newId}-temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
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
        productsUpdated++;

      } catch (error) {
        console.error(`✗ Error updating ${product.name}:`, error.message);
        productsErrors++;
      }
    }

    // Now update all accessories
    console.log('\n=== Updating Accessories ===\n');
    const accessories = await prisma.accessory.findMany({
      orderBy: { name: 'asc' },
      include: {
        product: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`Found ${accessories.length} accessories to update.\n`);

    let accessoriesUpdated = 0;
    let accessoriesSkipped = 0;
    let accessoriesErrors = 0;

    for (const accessory of accessories) {
      try {
        // Get product name for generating accessory ID
        const productName = accessory.product?.name || 'Unknown';
        
        // Generate new meaningful ID
        const newId = await generateAccessoryId({
          name: accessory.name,
          productName: productName,
          prisma
        });

        // Skip if ID is already in the correct format
        if (accessory.id === newId) {
          console.log(`✓ Skipped: ${accessory.name} (already has correct ID)`);
          accessoriesSkipped++;
          continue;
        }

        // Check if new ID already exists
        const existing = await prisma.accessory.findUnique({
          where: { id: newId }
        });

        if (existing && existing.id !== accessory.id) {
          console.log(`⚠ Skipped: ${accessory.name} (new ID ${newId} already exists)`);
          accessoriesSkipped++;
          continue;
        }

        // Update accessory with new ID
        const tempId = `${newId}-temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        // Update to temporary ID first
        await prisma.accessory.update({
          where: { id: accessory.id },
          data: { id: tempId }
        });

        // Then update to final ID
        await prisma.accessory.update({
          where: { id: tempId },
          data: { id: newId }
        });

        console.log(`✓ Updated: ${accessory.name}`);
        console.log(`  Old ID: ${accessory.id}`);
        console.log(`  New ID: ${newId}\n`);
        accessoriesUpdated++;

      } catch (error) {
        console.error(`✗ Error updating ${accessory.name}:`, error.message);
        accessoriesErrors++;
      }
    }

    console.log('\n=== Update Summary ===');
    console.log(`\nProducts:`);
    console.log(`  Total: ${products.length}`);
    console.log(`  Updated: ${productsUpdated}`);
    console.log(`  Skipped: ${productsSkipped}`);
    console.log(`  Errors: ${productsErrors}`);
    console.log(`\nAccessories:`);
    console.log(`  Total: ${accessories.length}`);
    console.log(`  Updated: ${accessoriesUpdated}`);
    console.log(`  Skipped: ${accessoriesSkipped}`);
    console.log(`  Errors: ${accessoriesErrors}`);

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateAllIds()
  .then(() => {
    console.log('\n✅ Product and Accessory ID update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

