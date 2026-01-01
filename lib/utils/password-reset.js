import crypto from 'crypto';

/**
 * Generate a secure password reset token
 * @returns {string} A random 32-byte hex token
 */
export function generatePasswordResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Set password reset token for a user
 * @param {Object} prisma - Prisma client instance
 * @param {string} userId - User ID
 * @param {number} expiryHours - Token expiry in hours (default: 24)
 * @returns {Promise<string>} The generated token
 */
export async function setPasswordResetToken(prisma, userId, expiryHours = 24) {
  const token = generatePasswordResetToken();
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + expiryHours);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordResetToken: token,
      passwordResetExpiry: expiry
    }
  });

  return token;
}

/**
 * Verify and get user by password reset token
 * @param {Object} prisma - Prisma client instance
 * @param {string} token - Password reset token
 * @returns {Promise<Object|null>} User object or null if invalid
 */
export async function verifyPasswordResetToken(prisma, token) {
  if (!token) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiry: {
        gt: new Date() // Token must not be expired
      }
    },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true
        }
      }
    }
  });

  return user;
}

/**
 * Clear password reset token after use
 * @param {Object} prisma - Prisma client instance
 * @param {string} userId - User ID
 */
export async function clearPasswordResetToken(prisma, userId) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordResetToken: null,
      passwordResetExpiry: null
    }
  });
}

