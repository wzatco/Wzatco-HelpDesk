// Script to update agent userIds to human-friendly values based on slug (fallback to name/email)
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function generateSlug(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function updateUserIds() {
  try {
    console.log('Updating agent userIds to human-friendly values...\n');

    const agents = await prisma.agent.findMany({
      select: { id: true, name: true, email: true, slug: true, userId: true },
      orderBy: { name: 'asc' }
    });

    const usedUserIds = new Set();
    const results = [];

    for (const agent of agents) {
      try {
        // Base userId from slug; fallback to name/email
        let baseUserId = agent.slug || generateSlug(agent.name);
        if (!baseUserId || baseUserId.length < 2) {
          if (agent.email) {
            const emailName = agent.email.split('@')[0];
            const cleanEmailName = emailName.replace(/wzatco|wzat|co/gi, '').trim();
            baseUserId = generateSlug(cleanEmailName || emailName);
          }
        }

        if (!baseUserId || baseUserId.length < 2) {
          console.warn(`⚠ Skipping ${agent.name} - cannot derive userId`);
          results.push({ agent: agent.name, oldUserId: agent.userId, newUserId: null, status: 'skipped' });
          continue;
        }

        // Ensure uniqueness across DB and this batch
        let uniqueUserId = baseUserId;
        let counter = 1;
        while (true) {
          const existsDb = await prisma.agent.findFirst({
            where: { userId: uniqueUserId, id: { not: agent.id } }
          });
          const existsBatch = usedUserIds.has(uniqueUserId);
          if (!existsDb && !existsBatch) break;
          uniqueUserId = `${baseUserId}-${counter}`;
          counter++;
        }

        usedUserIds.add(uniqueUserId);

        await prisma.agent.update({
          where: { id: agent.id },
          data: { userId: uniqueUserId }
        });

        const changed = agent.userId !== uniqueUserId;
        results.push({ agent: agent.name, oldUserId: agent.userId, newUserId: uniqueUserId, status: changed ? 'updated' : 'unchanged' });
        if (changed) {
          console.log(`✓ ${agent.name}: ${agent.userId || '(none)'} -> ${uniqueUserId}`);
        } else {
          console.log(`= ${agent.name}: already ${uniqueUserId}`);
        }
      } catch (err) {
        console.error(`✗ Error updating ${agent.name}:`, err.message);
        results.push({ agent: agent.name, oldUserId: agent.userId, newUserId: null, status: 'error', error: err.message });
      }
    }

    const summary = results.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      {}
    );

    console.log('\nSummary:', summary);
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserIds();

