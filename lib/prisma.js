import { PrismaClient } from '@prisma/client';

// Increase max listeners to prevent warning in development
if (process.env.NODE_ENV !== 'production') {
  process.setMaxListeners(20);
}

// Next.js Prisma Singleton Pattern
// Prevents multiple instances during hot reloads in development
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
};

const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma || prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Ensure Prisma client is connected
 * This is critical in development mode with hot reloading
 * @returns {Promise<void>}
 */
export async function ensurePrismaConnected() {
  // Do nothing - let Prisma lazy connect automatically
  // Calling $connect() or queries here causes race conditions in Next.js dev mode
  return Promise.resolve();
}

/**
 * Get Prisma client instance (singleton pattern)
 * @returns {PrismaClient} Prisma client instance
 */
export function getPrismaClient() {
  return prisma;
}

/**
 * Disconnect Prisma client (useful for cleanup)
 */
export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
  }
}

// Handle cleanup on process exit
if (process.env.NODE_ENV !== 'production') {
  process.on('beforeExit', async () => {
    await disconnectPrisma();
  });
}

// Export the raw prisma client - let Prisma handle connection automatically
export default prisma;

