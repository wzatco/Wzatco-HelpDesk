/**
 * Script to migrate existing ticket IDs to the new clean format
 * Old format: TKT-YYMM-CAT-PRI-SEQ or TKT-YYMM-CAT-SEQ
 * New format: TKT-YYMM-SEQ
 * 
 * Run with: node scripts/migrate-ticket-ids-to-new-format.js
 * 
 * WARNING: This script updates primary keys and all related foreign keys.
 * Make sure to backup your database before running this script.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function isOldFormat(id) {
  if (!id || !id.startsWith('TKT-')) {
    return false;
  }
  
  // Check if it has more than 3 parts (TKT-YYMM-SEQ = 3 parts, old formats have 4-5 parts)
  const parts = id.split('-');
  return parts.length > 3;
}

function getNewTicketId(yymm, sequence) {
  const seq = String(sequence).padStart(3, '0');
  return `TKT-${yymm}-${seq}`;
}

async function migrateTicketIds() {
  try {
    console.log('🚀 Starting ticket ID migration to new format...');
    console.log('⚠️  WARNING: This will update all ticket IDs and related records.');
    console.log('⚠️  Make sure you have a database backup before proceeding.\n');
    
    // Get all conversations (tickets)
    const conversations = await prisma.conversation.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        messages: { select: { id: true } },
        notes: { select: { id: true } },
        activities: { select: { id: true } },
        tags: { select: { id: true } },
        feedbacks: { select: { id: true } },
        worklogs: { select: { id: true } }
      }
    });

    console.log(`Found ${conversations.length} tickets to process`);

    // Filter tickets that need migration (old format)
    const ticketsToMigrate = conversations.filter(t => isOldFormat(t.id));
    const ticketsAlreadyNew = conversations.filter(t => !isOldFormat(t.id));

    console.log(`  - ${ticketsToMigrate.length} tickets need migration (old format)`);
    console.log(`  - ${ticketsAlreadyNew.length} tickets already in new format\n`);

    if (ticketsToMigrate.length === 0) {
      console.log('✅ All tickets are already in the new format!');
      return;
    }

    // Group tickets by month (YYMM) to assign sequential numbers
    const ticketsByMonth = new Map();
    
    ticketsToMigrate.forEach(ticket => {
      const year = ticket.createdAt.getFullYear().toString().slice(-2);
      const month = String(ticket.createdAt.getMonth() + 1).padStart(2, '0');
      const yymm = `${year}${month}`;
      
      if (!ticketsByMonth.has(yymm)) {
        ticketsByMonth.set(yymm, []);
      }
      ticketsByMonth.get(yymm).push(ticket);
    });

    // Sort tickets within each month by creation date
    ticketsByMonth.forEach((tickets, yymm) => {
      tickets.sort((a, b) => a.createdAt - b.createdAt);
    });

    // Generate new IDs for each ticket
    const idMappings = new Map(); // oldId -> newId
    const newIdSet = new Set(); // Track new IDs to avoid conflicts

    // First, get all existing new format IDs to avoid conflicts
    ticketsAlreadyNew.forEach(ticket => {
      newIdSet.add(ticket.id);
    });

    ticketsByMonth.forEach((tickets, yymm) => {
      let sequence = 1;
      
      tickets.forEach(ticket => {
        let newId;
        do {
          newId = getNewTicketId(yymm, sequence);
          sequence++;
        } while (newIdSet.has(newId));
        
        newIdSet.add(newId);
        idMappings.set(ticket.id, newId);
      });
    });

    console.log(`Generated ${idMappings.size} new ticket IDs\n`);
    console.log('Starting migration (this may take a while)...\n');

    let updated = 0;
    let errors = 0;

    // Process each ticket migration
    for (const [oldId, newId] of idMappings.entries()) {
      try {
        const ticket = ticketsToMigrate.find(t => t.id === oldId);
        if (!ticket) continue;

        // Use a transaction to ensure atomicity
        // For SQLite, we create a new conversation with new ID, update foreign keys, then delete old one
        await prisma.$transaction(async (tx) => {
          // Step 1: Create new conversation with new ID
          await tx.conversation.create({
            data: {
              id: newId,
              siteId: ticket.siteId,
              status: ticket.status,
              subject: ticket.subject,
              assigneeId: ticket.assigneeId,
              customerId: ticket.customerId,
              departmentId: ticket.departmentId,
              createdAt: ticket.createdAt,
              updatedAt: ticket.updatedAt,
              lastMessageAt: ticket.lastMessageAt,
              category: ticket.category,
              customerName: ticket.customerName,
              priority: ticket.priority,
              productModel: ticket.productModel,
              firstResponseAt: ticket.firstResponseAt,
              firstResponseTimeSeconds: ticket.firstResponseTimeSeconds,
              agentTATSeconds: ticket.agentTATSeconds,
              resolutionTimeSeconds: ticket.resolutionTimeSeconds
            }
          });

          // Step 2: Update all foreign keys to point to new conversation ID
          if (ticket.messages.length > 0) {
            await tx.message.updateMany({
              where: { conversationId: oldId },
              data: { conversationId: newId }
            });
          }

          if (ticket.notes.length > 0) {
            await tx.ticketNote.updateMany({
              where: { conversationId: oldId },
              data: { conversationId: newId }
            });
          }

          if (ticket.activities.length > 0) {
            await tx.ticketActivity.updateMany({
              where: { conversationId: oldId },
              data: { conversationId: newId }
            });
          }

          if (ticket.tags.length > 0) {
            await tx.conversationTag.updateMany({
              where: { conversationId: oldId },
              data: { conversationId: newId }
            });
          }

          if (ticket.feedbacks.length > 0) {
            await tx.feedback.updateMany({
              where: { conversationId: oldId },
              data: { conversationId: newId }
            });
          }

          if (ticket.worklogs.length > 0) {
            await tx.worklog.updateMany({
              where: { conversationId: oldId },
              data: { conversationId: newId }
            });
          }

          // Step 3: Delete old conversation
          await tx.conversation.delete({
            where: { id: oldId }
          });
        });

        updated++;
        if (updated % 10 === 0) {
          console.log(`  Progress: ${updated}/${idMappings.size} tickets migrated...`);
        }
      } catch (error) {
        console.error(`  ✗ Error migrating ticket ${oldId} -> ${newId}:`, error.message);
        errors++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`  Updated: ${updated} tickets`);
    console.log(`  Errors: ${errors}`);
    
    if (errors > 0) {
      console.log(`\n⚠️  Some tickets failed to migrate. Please check the errors above.`);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateTicketIds();

