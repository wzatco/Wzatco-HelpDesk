import prisma, { ensurePrismaConnected } from '@/lib/prisma';


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
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
        
        lowResponseTime: 120,
        lowResolutionTime: 720,
        mediumResponseTime: 60,
        mediumResolutionTime: 480,
        highResponseTime: 30,
        highResolutionTime: 240,
        urgentResponseTime: 10,
        urgentResolutionTime: 120,
        
        useBusinessHours: false,
        timezone: 'UTC',
        
        escalationLevel1: 70,
        escalationLevel2: 90,
        
        pauseOnWaiting: false,
        pauseOnHold: true,
        pauseOffHours: false,
      },
    });

    console.log('✅ Created high priority policy:', highPriorityPolicy.name);

    // Create Basic policy
    const basicPolicy = await prisma.sLAPolicy.upsert({
      where: { id: 'basic-sla' },
      update: {},
      create: {
        id: 'basic-sla',
        name: 'Basic SLA',
        description: 'Relaxed SLA for low-priority general inquiries',
        isDefault: false,
        isActive: true,
        
        lowResponseTime: 1440,
        lowResolutionTime: 7200,
        mediumResponseTime: 720,
        mediumResolutionTime: 2880,
        highResponseTime: 240,
        highResolutionTime: 1440,
        urgentResponseTime: 60,
        urgentResolutionTime: 480,
        
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

    return res.status(200).json({
      success: true,
      message: 'SLA Policies seeded successfully!',
      policies: [
        { id: defaultPolicy.id, name: defaultPolicy.name },
        { id: highPriorityPolicy.id, name: highPriorityPolicy.name },
        { id: basicPolicy.id, name: basicPolicy.name },
      ],
    });
  } catch (error) {
    console.error('❌ Error seeding SLA policies:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to seed SLA policies',
      error: error.message,
    });
  }
}

