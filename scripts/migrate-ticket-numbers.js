// Migration script to generate ticket numbers for existing tickets
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Generate ticket number in format: TKT-YYMM-DD-{3 random uppercase letters}
function generateTicketNumber() {
  const prefix = 'TKT';
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomLetters = Array.from({ length: 3 }, () => 
    letters[Math.floor(Math.random() * letters.length)]
  ).join('');
  
  return `${prefix}-${year}${month}-${day}-${randomLetters}`;
}

async function migrateTicketNumbers() {
  try {
    console.log('🔄 Starting ticket number migration...');
    
    // Find all tickets without ticketNumber
    const ticketsWithoutNumber = await prisma.conversation.findMany({
      where: {
        ticketNumber: null
      }
    });
    
    console.log(`📋 Found ${ticketsWithoutNumber.length} tickets without ticket numbers`);
    
    if (ticketsWithoutNumber.length === 0) {
      console.log('✅ All tickets already have ticket numbers!');
      return;
    }
    
    // Generate unique ticket numbers for each ticket
    const usedNumbers = new Set();
    const updates = [];
    
    for (const ticket of ticketsWithoutNumber) {
      let ticketNumber;
      let attempts = 0;
      
      // Ensure uniqueness
      do {
        ticketNumber = generateTicketNumber();
        attempts++;
        
        if (attempts > 100) {
          // Fallback: use timestamp-based number
          const timestamp = Date.now().toString(36).toUpperCase();
          ticketNumber = `TKT-${ticket.createdAt.getFullYear().toString().slice(-2)}${(ticket.createdAt.getMonth() + 1).toString().padStart(2, '0')}-${ticket.createdAt.getDate().toString().padStart(2, '0')}-${timestamp.slice(-3)}`;
        }
      } while (usedNumbers.has(ticketNumber));
      
      usedNumbers.add(ticketNumber);
      
      // Check if this number already exists in DB
      const existing = await prisma.conversation.findUnique({
        where: { ticketNumber }
      });
      
      if (existing) {
        // If exists, add timestamp suffix
        const timestamp = Date.now().toString(36).toUpperCase();
        ticketNumber = `${ticketNumber}-${timestamp.slice(-2)}`;
      }
      
      updates.push({
        id: ticket.id,
        ticketNumber
      });
    }
    
    // Update all tickets
    console.log('📝 Updating tickets...');
    for (const update of updates) {
      try {
        await prisma.conversation.update({
          where: { id: update.id },
          data: { ticketNumber: update.ticketNumber }
        });
        console.log(`  ✅ Updated ticket ${update.id} -> ${update.ticketNumber}`);
      } catch (error) {
        console.error(`  ❌ Failed to update ticket ${update.id}:`, error.message);
      }
    }
    
    console.log('✅ Migration completed!');
    console.log(`📊 Updated ${updates.length} tickets`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateTicketNumbers()
  .then(() => {
    console.log('🎉 Migration script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });

