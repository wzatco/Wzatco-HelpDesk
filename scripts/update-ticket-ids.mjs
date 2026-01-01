/**
 * Script to update existing ticket (conversation) IDs to the new formatted format
 * Run with: node scripts/update-ticket-ids.mjs
 * 
 * Note: This uses ES modules (.mjs extension)
 * 
 * WARNING: This script updates primary keys and all related foreign keys.
 * Make sure to backup your database before running this script.
 */

import { PrismaClient } from '@prisma/client';
import { generateTicketId, getNextTicketSequence, getCategoryCode, getPriorityCode } from '../lib/ticketIdGenerator.js';

const prisma = new PrismaClient();

async function updateTicketIds() {
  try {
    console.log('Starting ticket ID update...');
    console.log('⚠️  WARNING: This will update all ticket IDs and related records.');
    console.log('⚠️  Make sure you have a database backup before proceeding.\n');
    
    // Get all conversations (tickets)
    const conversations = await prisma.conversation.findMany({
      orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${conversations.length} tickets to process`);

    const updates = [];
    const errors = [];
    const skipped = [];

    // Group tickets by category/priority/date to assign sequential numbers
    const ticketGroups = new Map();
    
    // Prepare updates - group by category/priority/date
    for (const ticket of conversations) {
      try {
        // Skip if already in new format
        if (ticket.id.startsWith('TKT-')) {
          skipped.push(ticket.id);
          continue;
        }

        const category = ticket.category || 'WZATCO';
        const priority = ticket.priority || 'low';
        const createdAt = ticket.createdAt;

        // Create group key
        const year = createdAt.getFullYear().toString().slice(-2);
        const month = String(createdAt.getMonth() + 1).padStart(2, '0');
        const yymm = `${year}${month}`;
        const catCode = getCategoryCode(category);
        const priCode = getPriorityCode(priority);
        const groupKey = `${yymm}-${catCode}-${priCode}`;

        if (!ticketGroups.has(groupKey)) {
          ticketGroups.set(groupKey, []);
        }
        ticketGroups.get(groupKey).push({ ticket, category, priority, createdAt });
      } catch (error) {
        errors.push({ ticketId: ticket.id, error: error.message });
        console.error(`Error processing ticket ${ticket.id}:`, error.message);
      }
    }

    console.log(`Skipped ${skipped.length} tickets already in new format`);
    console.log(`Grouped ${conversations.length - skipped.length} tickets into ${ticketGroups.size} groups\n`);

    // Generate IDs for each group with proper sequencing
    for (const [groupKey, groupTickets] of ticketGroups.entries()) {
      // Sort by creation date to maintain order
      groupTickets.sort((a, b) => a.ticket.createdAt - b.ticket.createdAt);
      
      // Get base sequence for this group
      const firstTicket = groupTickets[0];
      let baseSequence = await getNextTicketSequence(
        prisma, 
        firstTicket.category, 
        firstTicket.priority, 
        firstTicket.createdAt
      );

      // Generate IDs for all tickets in this group
      for (let i = 0; i < groupTickets.length; i++) {
        const { ticket, category, priority, createdAt } = groupTickets[i];
        const sequence = baseSequence + i;
        
        const year = createdAt.getFullYear().toString().slice(-2);
        const month = String(createdAt.getMonth() + 1).padStart(2, '0');
        const yymm = `${year}${month}`;
        const catCode = getCategoryCode(category);
        const priCode = getPriorityCode(priority);
        const seq = String(sequence).padStart(3, '0');
        const newId = `TKT-${yymm}-${catCode}-${priCode}-${seq}`;

        // Check if new ID already exists
        const existing = await prisma.conversation.findUnique({
          where: { id: newId }
        });

        if (existing && existing.id !== ticket.id) {
          // ID conflict - increment further
          const conflictSequence = await getNextTicketSequence(prisma, category, priority, createdAt);
          const altSeq = String(conflictSequence + 1000).padStart(3, '0'); // Use high number to avoid conflicts
          const altId = `TKT-${yymm}-${catCode}-${priCode}-${altSeq}`;
          updates.push({ oldId: ticket.id, newId: altId, ticket });
        } else {
          updates.push({ oldId: ticket.id, newId, ticket });
        }
      }
    }

    console.log(`Prepared ${updates.length} updates, ${errors.length} errors\n`);

    // Execute updates
    let updatedCount = 0;
    let failedCount = 0;

    for (const update of updates) {
      try {
        const { ticket } = update;

        // Check if new ID already exists
        const existingNewId = await prisma.conversation.findUnique({
          where: { id: update.newId }
        });

        if (existingNewId && existingNewId.id !== update.oldId) {
          console.log(`⚠ Skipping ${update.oldId} - new ID ${update.newId} already exists`);
          continue;
        }

        // Get counts of related data for logging
        const [messageCount, noteCount, activityCount, tagCount] = await Promise.all([
          prisma.message.count({ where: { conversationId: update.oldId } }),
          prisma.ticketNote.count({ where: { conversationId: update.oldId } }),
          prisma.ticketActivity.count({ where: { conversationId: update.oldId } }),
          prisma.conversationTag.count({ where: { conversationId: update.oldId } })
        ]);

        // Use a transaction to ensure atomicity
        await prisma.$transaction(async (tx) => {
          // Step 1: Create new conversation with new ID
          await tx.conversation.create({
            data: {
              id: update.newId,
              siteId: ticket.siteId,
              status: ticket.status,
              subject: ticket.subject,
              assigneeId: ticket.assigneeId,
              customerId: ticket.customerId,
              createdAt: ticket.createdAt,
              updatedAt: ticket.updatedAt,
              lastMessageAt: ticket.lastMessageAt,
              category: ticket.category,
              customerName: ticket.customerName,
              priority: ticket.priority,
              productModel: ticket.productModel
            }
          });

          // Step 2: Update all foreign keys to point to new conversation ID
          // Update messages
          if (messageCount > 0) {
            await tx.message.updateMany({
              where: { conversationId: update.oldId },
              data: { conversationId: update.newId }
            });
          }

          // Update notes
          if (noteCount > 0) {
            await tx.ticketNote.updateMany({
              where: { conversationId: update.oldId },
              data: { conversationId: update.newId }
            });
          }

          // Update activities
          if (activityCount > 0) {
            await tx.ticketActivity.updateMany({
              where: { conversationId: update.oldId },
              data: { conversationId: update.newId }
            });
          }

          // Update tags
          if (tagCount > 0) {
            await tx.conversationTag.updateMany({
              where: { conversationId: update.oldId },
              data: { conversationId: update.newId }
            });
          }

          // Step 3: Delete old conversation
          await tx.conversation.delete({
            where: { id: update.oldId }
          });
        });

        updatedCount++;
        console.log(`✓ Updated ${update.oldId} → ${update.newId} (${messageCount} messages, ${noteCount} notes, ${activityCount} activities, ${tagCount} tags)`);
      } catch (error) {
        failedCount++;
        errors.push({ oldId: update.oldId, error: error.message });
        console.error(`✗ Failed to update ${update.oldId}:`, error.message);
      }
    }

    console.log('\n=== Update Summary ===');
    console.log(`Total tickets: ${conversations.length}`);
    console.log(`Skipped (already in new format): ${skipped.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Failed: ${failedCount}`);
    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(err => console.log(`  - ${err.ticketId || err.oldId}: ${err.error}`));
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run
updateTicketIds()
  .then(() => {
    console.log('\n✅ Ticket ID update completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ticket ID update failed:', error);
    process.exit(1);
  });

