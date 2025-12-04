const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SLA Policies...');

  // Create default SLA policy
  const defaultPolicy = await prisma.sLAPolicy.upsert({
    where: { id: 'default-policy' },
    update: {},
    create: {
      id: 'default-policy',
      name: 'Standard Support SLA',
      description: 'Default SLA policy for all tickets',
      isDefault: true,
      isActive: true,
      
      // Low Priority (8 hours / 48 hours)
      lowResponseTime: 480,
      lowResolutionTime: 2880,
      
      // Medium Priority (4 hours / 24 hours)
      mediumResponseTime: 240,
      mediumResolutionTime: 1440,
      
      // High Priority (1 hour / 8 hours)
      highResponseTime: 60,
      highResolutionTime: 480,
      
      // Urgent Priority (15 minutes / 4 hours)
      urgentResponseTime: 15,
      urgentResolutionTime: 240,
      
      // Business hours configuration
      useBusinessHours: true,
      businessHours: JSON.stringify({
        monday: { start: '09:00', end: '18:00' },
        tuesday: { start: '09:00', end: '18:00' },
        wednesday: { start: '09:00', end: '18:00' },
        thursday: { start: '09:00', end: '18:00' },
        friday: { start: '09:00', end: '18:00' },
        saturday: { start: '10:00', end: '14:00' },
        sunday: { start: null, end: null }
      }),
      timezone: 'UTC',
      
      // Escalation thresholds
      escalationLevel1: 80,
      escalationLevel2: 95,
      
      // Pause conditions
      pauseOnWaiting: true,
      pauseOnHold: true,
      pauseOffHours: true,
    },
  });

  console.log('✅ Created default policy:', defaultPolicy.name);

  // Create High Priority policy
  const highPriorityPolicy = await prisma.sLAPolicy.upsert({
    where: { id: 'high-priority-sla' },
    update: {},
    create: {
      id: 'high-priority-sla',
      name: 'High Priority SLA',
      description: 'Aggressive SLA for high-priority tickets',
      isDefault: false,
      isActive: true,
      
      // High Priority - more aggressive timers
      lowResponseTime: 120,
      lowResolutionTime: 720,
      mediumResponseTime: 60,
      mediumResolutionTime: 480,
      highResponseTime: 30,
      highResolutionTime: 240,
      urgentResponseTime: 10,
      urgentResolutionTime: 120,
      
      useBusinessHours: false, // 24/7 support
      timezone: 'UTC',
      
      escalationLevel1: 70,
      escalationLevel2: 90,
      
      pauseOnWaiting: false,
      pauseOnHold: true,
      pauseOffHours: false,
    },
  });

  console.log('✅ Created high priority policy:', highPriorityPolicy.name);

  // Create Low Priority / Basic policy
  const basicPolicy = await prisma.sLAPolicy.upsert({
    where: { id: 'basic-sla' },
    update: {},
    create: {
      id: 'basic-sla',
      name: 'Basic SLA',
      description: 'Relaxed SLA for low-priority general inquiries',
      isDefault: false,
      isActive: true,
      
      // More relaxed timers
      lowResponseTime: 1440, // 24 hours
      lowResolutionTime: 7200, // 5 days
      mediumResponseTime: 720, // 12 hours
      mediumResolutionTime: 2880, // 2 days
      highResponseTime: 240, // 4 hours
      highResolutionTime: 1440, // 1 day
      urgentResponseTime: 60, // 1 hour
      urgentResolutionTime: 480, // 8 hours
      
      useBusinessHours: true,
      timezone: 'UTC',
      
      escalationLevel1: 85,
      escalationLevel2: 95,
      
      pauseOnWaiting: true,
      pauseOnHold: true,
      pauseOffHours: true,
    },
  });

  console.log('✅ Created basic policy:', basicPolicy.name);

  console.log('\n🎉 SLA Policies seeded successfully!\n');
  console.log('Policies created:');
  console.log('  1. Standard Support SLA (default)');
  console.log('  2. High Priority SLA');
  console.log('  3. Basic SLA\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding SLA policies:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

