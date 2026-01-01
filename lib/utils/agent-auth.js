import jwt from 'jsonwebtoken';

// Get JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET is not set in environment variables. Using fallback secret (NOT SECURE FOR PRODUCTION).');
}

/**
 * Get the current agent ID from the request
 * @param {Object} req - Next.js request object
 * @returns {Promise<string|null>} Agent ID or null if not authenticated
 */
export async function getCurrentAgentId(req) {
  try {
    // Try to get token from Authorization header first, then cookies, then query
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const token = authHeader?.replace('Bearer ', '') || 
                  req.cookies?.agentAuthToken ||
                  req.query?.token;

    if (!token) {
      return null;
    }

    // Verify JWT token using environment variable
    const secret = JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, secret);
    
    // Check if it's an agent token
    // The token from login.js contains id (agent.id) and type: 'agent'
    if (decoded.type === 'agent' && decoded.id) {
      return decoded.id;
    }

    // Fallback: If token has id, use it (for backward compatibility)
    if (decoded.id) {
      return decoded.id;
    }

    // If token has userId, try to find the agent by userId
    if (decoded.userId) {
      const prismaModule = await import('../prisma');
      const prisma = prismaModule.default;
      const { ensurePrismaConnected } = prismaModule;
      
      // Ensure Prisma is connected before querying
      if (ensurePrismaConnected) {
        await ensurePrismaConnected();
      }
      
      const agent = await prisma.agent.findUnique({
        where: { userId: decoded.userId },
        select: { id: true }
      });

      return agent?.id || null;
    }

    return null;
  } catch (error) {
    // If token is invalid (wrong signature), it means the JWT_SECRET changed
    // This is expected when the secret is updated - user needs to log in again
    if (error.name === 'JsonWebTokenError' && error.message.includes('invalid signature')) {
      console.warn('⚠️  JWT token signature invalid - user needs to log in again');
    } else {
      console.error('Error getting current agent ID:', error);
    }
    return null;
  }
}

/**
 * Get the current agent from the request
 * @param {Object} req - Next.js request object
 * @returns {Promise<Object|null>} Agent object or null if not authenticated
 */
export async function getCurrentAgent(req) {
  try {
    const agentId = await getCurrentAgentId(req);
    
    if (!agentId) {
      return null;
    }

    const prismaModule = await import('../prisma');
    const prisma = prismaModule.default;
    const { ensurePrismaConnected } = prismaModule;
    
    // Ensure Prisma is connected before querying
    if (ensurePrismaConnected) {
      await ensurePrismaConnected();
    }
    
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        department: true,
        role: true,
        account: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    return agent;
  } catch (error) {
    console.error('Error getting current agent:', error);
    return null;
  }
}

/**
 * Check if agent is authenticated, throw error if not
 * @param {Object} req - Next.js request object
 * @throws {Error} If agent is not authenticated
 * @returns {Promise<string>} Agent ID
 */
export async function requireAgentAuth(req) {
  const agentId = await getCurrentAgentId(req);
  
  if (!agentId) {
    const error = new Error('Unauthorized');
    error.statusCode = 401;
    throw error;
  }

  return agentId;
}

