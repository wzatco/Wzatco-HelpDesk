/**
 * Script to check which customers have multiple tickets
 * Run with: node scripts/check-customers-multiple-tickets.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCustomersWithMultipleTickets() {
  try {
    console.log('Checking customers with multiple tickets...\n');

    // Get all customers with their ticket counts
    const customers = await prisma.customer.findMany({
      include: {
        _count: {
          select: {
            conversations: true
          }
        },
        conversations: {
          select: {
            id: true,
            subject: true,
            status: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        conversations: {
          _count: 'desc'
        }
      }
    });

    // Filter customers with more than 1 ticket
    const customersWithMultipleTickets = customers.filter(
      customer => customer._count.conversations > 1
    );

    console.log(`Found ${customersWithMultipleTickets.length} customers with multiple tickets:\n`);

    customersWithMultipleTickets.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.name} (${customer.email || 'No email'})`);
      console.log(`   Customer ID: ${customer.id}`);
      console.log(`   Total Tickets: ${customer._count.conversations}`);
      console.log(`   Tickets:`);
      customer.conversations.forEach((ticket, ticketIndex) => {
        console.log(`     ${ticketIndex + 1}. ${ticket.id} - ${ticket.subject || 'No subject'}`);
        console.log(`        Status: ${ticket.status} | Created: ${ticket.createdAt.toLocaleString()}`);
      });
      console.log('');
    });

    // Summary
    console.log('\n=== Summary ===');
    console.log(`Total customers: ${customers.length}`);
    console.log(`Customers with multiple tickets: ${customersWithMultipleTickets.length}`);
    console.log(`Customers with single ticket: ${customers.length - customersWithMultipleTickets.length}`);
    
    if (customersWithMultipleTickets.length > 0) {
      const maxTickets = Math.max(...customersWithMultipleTickets.map(c => c._count.conversations));
      const customerWithMostTickets = customersWithMultipleTickets.find(
        c => c._count.conversations === maxTickets
      );
      console.log(`\nCustomer with most tickets: ${customerWithMostTickets.name} (${maxTickets} tickets)`);
    }

  } catch (error) {
    console.error('Error checking customers:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run
checkCustomersWithMultipleTickets()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });

