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

// Connection state tracking
let isConnecting = false;
let isConnected = false;
const connectionPromise = null;

/**
 * Ensure Prisma client is connected
 * This is critical in development mode with hot reloading
 * @returns {Promise<void>}
 */
export async function ensurePrismaConnected() {
  // If already connected, return immediately
  if (isConnected) {
    return;
  }

  // If another request is already connecting, wait for it
  if (isConnecting) {
    // Wait a bit and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return ensurePrismaConnected();
  }

  // Mark as connecting
  isConnecting = true;

  try {
    await prisma.$connect();
    isConnected = true;
    isConnecting = false;
    console.log('🔌 [Prisma] Connected to database');
  } catch (error) {
    isConnecting = false;
    // Ignore "already connected" errors
    if (error.message?.includes('already connected')) {
      isConnected = true;
      return;
    }
    console.error('❌ [Prisma] Connection error:', error.message);
    throw error;
  }
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
    isConnected = false;
    await prisma.$disconnect();
  }
}

// Handle cleanup on process exit
if (process.env.NODE_ENV !== 'production') {
  process.on('beforeExit', async () => {
    isConnected = false;
    await disconnectPrisma();
  });
}

// Auto-connect eagerly to prevent "Engine is not yet connected" errors
(async () => {
  try {
    await ensurePrismaConnected();
  } catch (err) {
    console.error('❌ [Prisma] Failed to connect on module load:', err.message);
  }
})();

// Export the raw prisma client - let Prisma handle connection automatically
export default prisma;

