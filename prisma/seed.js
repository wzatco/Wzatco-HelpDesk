const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with sample data...');

  // Create WZATCO support agents
  const agents = await Promise.all([
    prisma.agent.create({
      data: {
        name: 'Rajesh Kumar',
        email: 'rajesh@wzatco.com',
        userId: 'agent-001'
      }
    }),
    prisma.agent.create({
      data: {
        name: 'Priya Sharma',
        email: 'priya@wzatco.com',
        userId: 'agent-002'
      }
    }),
    prisma.agent.create({
      data: {
        name: 'Amit Patel',
        email: 'amit@wzatco.com',
        userId: 'agent-003'
      }
    }),
    prisma.agent.create({
      data: {
        name: 'Sneha Reddy',
        email: 'sneha@wzatco.com',
        userId: 'agent-004'
      }
    }),
    prisma.agent.create({
      data: {
        name: 'Vikram Singh',
        email: 'vikram@wzatco.com',
        userId: 'agent-005'
      }
    })
  ]);

  console.log(`✅ Created ${agents.length} agents`);

  // Create customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: 'Arjun Mehta',
        email: 'arjun.mehta@email.com',
        phone: '+91-9876543210',
        company: 'TechCorp Solutions',
        location: 'Mumbai, India'
      }
    }),
    prisma.customer.create({
      data: {
        name: 'Priya Patel',
        email: 'priya.patel@email.com',
        phone: '+91-9876543211',
        company: 'Digital Innovations',
        location: 'Delhi, India'
      }
    }),
    prisma.customer.create({
      data: {
        name: 'Rajesh Kumar',
        email: 'rajesh.kumar@email.com',
        phone: '+91-9876543212',
        company: 'EduTech Systems',
        location: 'Bangalore, India'
      }
    }),
    prisma.customer.create({
      data: {
        name: 'Sneha Sharma',
        email: 'sneha.sharma@email.com',
        phone: '+91-9876543213',
        company: 'Creative Studios',
        location: 'Chennai, India'
      }
    }),
    prisma.customer.create({
      data: {
        name: 'Vikram Singh',
        email: 'vikram.singh@email.com',
        phone: '+91-9876543214',
        company: 'Media Solutions',
        location: 'Pune, India'
      }
    })
  ]);

  console.log(`✅ Created ${customers.length} customers`);

  // Create WZATCO projector support conversations (tickets)
  const conversations = await Promise.all([
    prisma.conversation.create({
      data: {
        siteId: 'wzatco-001',
        status: 'open',
        subject: 'Yuva Blaze Plus - Android system not responding',
        assigneeId: agents[0].id,
        customerId: customers[0].id,
        lastMessageAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        messages: {
          create: [
            {
              senderId: 'customer-001',
              senderType: 'customer',
              content: 'My Yuva Blaze Plus projector is stuck on the Android boot screen and won\'t start properly. I tried restarting but it keeps looping.',
              type: 'text',
              createdAt: new Date(Date.now() - 2 * 60 * 1000)
            },
            {
              senderId: agents[0].id,
              senderType: 'agent',
              content: 'I understand your frustration with the Android system issue. Let me help you with a factory reset procedure. Please hold the power button for 10 seconds while the device is on.',
              type: 'text',
              createdAt: new Date(Date.now() - 1 * 60 * 1000)
            }
          ]
        }
      }
    }),
    prisma.conversation.create({
      data: {
        siteId: 'wzatco-002',
        status: 'open',
        subject: 'Legend Pro - Warranty claim for flickering display',
        assigneeId: agents[1].id,
        customerId: customers[1].id,
        lastMessageAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        messages: {
          create: [
            {
              senderId: 'customer-002',
              senderType: 'customer',
              content: 'My Legend Pro projector display is flickering constantly. I purchased it 8 months ago and it\'s still under warranty. Can you help me with a replacement?',
              type: 'text',
              createdAt: new Date(Date.now() - 5 * 60 * 1000)
            },
            {
              senderId: agents[1].id,
              senderType: 'agent',
              content: 'I\'m sorry to hear about the flickering issue with your Legend Pro. Since it\'s under our 1-year warranty, I\'ll process a replacement for you. Please provide your purchase invoice.',
              type: 'text',
              createdAt: new Date(Date.now() - 3 * 60 * 1000)
            }
          ]
        }
      }
    }),
    prisma.conversation.create({
      data: {
        siteId: 'wzatco-003',
        status: 'closed',
        subject: 'Yuva Go Max - Bluetooth connectivity resolved',
        assigneeId: agents[2].id,
        customerId: customers[2].id,
        lastMessageAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        messages: {
          create: [
            {
              senderId: 'customer-003',
              senderType: 'customer',
              content: 'My Yuva Go Max projector is not connecting to Bluetooth speakers. I\'ve tried multiple devices but it keeps failing to pair.',
              type: 'text',
              createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
            },
            {
              senderId: agents[2].id,
              senderType: 'agent',
              content: 'Let me help you with the Bluetooth connectivity issue. Please try resetting the Bluetooth module by going to Settings > Bluetooth > Reset Bluetooth.',
              type: 'text',
              createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000)
            },
            {
              senderId: 'customer-003',
              senderType: 'customer',
              content: 'That worked perfectly! The Bluetooth is now connecting to all my devices. Thank you for the quick solution!',
              type: 'text',
              createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
            }
          ]
        }
      }
    }),
    prisma.conversation.create({
      data: {
        siteId: 'wzatco-004',
        status: 'open',
        subject: 'Alpha Xtreme - Keystone adjustment not working',
        assigneeId: agents[3].id,
        customerId: customers[3].id,
        lastMessageAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        messages: {
          create: [
            {
              senderId: 'customer-004',
              senderType: 'customer',
              content: 'The keystone adjustment on my Alpha Xtreme projector is not responding. The image is tilted and I can\'t correct it using the remote or on-device controls.',
              type: 'text',
              createdAt: new Date(Date.now() - 10 * 60 * 1000)
            }
          ]
        }
      }
    }),
    prisma.conversation.create({
      data: {
        siteId: 'wzatco-005',
        status: 'open',
        subject: 'Luxury Series - Overheating issue',
        assigneeId: agents[4].id,
        customerId: customers[4].id,
        lastMessageAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        messages: {
          create: [
            {
              senderId: 'customer-005',
              senderType: 'customer',
              content: 'My Luxury Series projector is overheating and shutting down after 30 minutes of use. The fan seems to be working but the device gets very hot.',
              type: 'text',
              createdAt: new Date(Date.now() - 15 * 60 * 1000)
            },
            {
              senderId: agents[4].id,
              senderType: 'agent',
              content: 'This sounds like a thermal management issue. Can you check if the air vents are clear and the projector is placed in a well-ventilated area?',
              type: 'text',
              createdAt: new Date(Date.now() - 12 * 60 * 1000)
            }
          ]
        }
      }
    }),
    prisma.conversation.create({
      data: {
        siteId: 'wzatco-006',
        status: 'closed',
        subject: 'Yuva Vibe - Remote control replacement',
        assigneeId: agents[0].id,
        customerId: customers[0].id,
        lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        messages: {
          create: [
            {
              senderId: 'customer-006',
              senderType: 'customer',
              content: 'The remote control for my Yuva Vibe projector stopped working. I need a replacement remote control.',
              type: 'text',
              createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
            },
            {
              senderId: agents[0].id,
              senderType: 'agent',
              content: 'I\'ve arranged for a replacement remote control to be shipped to your address. You should receive it within 3-5 business days.',
              type: 'text',
              createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
            }
          ]
        }
      }
    }),
    prisma.conversation.create({
    data: {
        siteId: 'wzatco-007',
      status: 'open',
        subject: 'Yuva Go Pro - WiFi connectivity issues',
        assigneeId: null, // Unassigned
        customerId: customers[1].id,
        lastMessageAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        messages: {
          create: [
            {
              senderId: 'customer-007',
              senderType: 'customer',
              content: 'My Yuva Go Pro projector keeps disconnecting from WiFi. It connects initially but drops the connection after a few minutes.',
              type: 'text',
              createdAt: new Date(Date.now() - 30 * 60 * 1000)
            }
          ]
        }
      }
    }),
    prisma.conversation.create({
      data: {
        siteId: 'wzatco-008',
        status: 'closed',
        subject: 'Legend Optimus - Audio output resolved',
        assigneeId: agents[1].id,
        customerId: customers[2].id,
        lastMessageAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        messages: {
          create: [
            {
              senderId: 'customer-008',
              senderType: 'customer',
              content: 'My Legend Optimus projector has no audio output. The speakers are not working at all, even with external speakers connected.',
              type: 'text',
              createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
            },
            {
              senderId: agents[1].id,
              senderType: 'agent',
              content: 'Thank you for the detailed report. I\'ve identified this as a firmware issue and provided you with the latest firmware update. The audio should work perfectly after the update.',
              type: 'text',
              createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
            }
          ]
        }
      }
    })
  ]);

  console.log(`✅ Created ${conversations.length} conversations`);

  // Get messages for read receipts
  const allMessages = await prisma.message.findMany({
    where: {
      conversationId: {
        in: conversations.map(c => c.id)
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  // Create some read receipts
  if (allMessages.length > 0) {
    await Promise.all([
      prisma.readReceipt.create({
        data: {
          messageId: allMessages[0].id,
          userId: agents[0].id,
          readAt: new Date(Date.now() - 1 * 60 * 1000)
        }
      }),
      prisma.readReceipt.create({
        data: {
          messageId: allMessages[1]?.id || allMessages[0].id,
          userId: agents[1].id,
          readAt: new Date(Date.now() - 2 * 60 * 1000)
        }
      })
    ]);
  }

  console.log('✅ Created read receipts');

  console.log('🎉 Database seeded successfully!');
  console.log(`📊 Summary:`);
  console.log(`   - ${agents.length} agents`);
  console.log(`   - ${conversations.length} conversations`);
  
  // Count total messages
  const totalMessages = await prisma.message.count();
  console.log(`   - ${totalMessages} messages`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });