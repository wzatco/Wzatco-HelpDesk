// Cryptographic utilities for API key security
import crypto from 'crypto';

const HMAC_SECRET = process.env.HMAC_SECRET || process.env.JWT_SECRET || 'your-hmac-secret-key-change-in-production';

/**
 * Hash an API key using HMAC-SHA256
 * @param {string} apiKey - The API key to hash
 * @returns {string} - The HMAC hash
 */
export function hashApiKey(apiKey) {
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  return crypto.createHmac('sha256', HMAC_SECRET).update(apiKey).digest('hex');
}

/**
 * Verify an API key against a stored hash
 * @param {string} apiKey - The API key to verify
 * @param {string} storedHash - The stored hash to compare against
 * @returns {boolean} - True if the API key matches the hash
 */
export function verifyApiKey(apiKey, storedHash) {
  if (!apiKey || !storedHash) {
    return false;
  }
  const computedHash = hashApiKey(apiKey);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, 'hex'),
    Buffer.from(storedHash, 'hex')
  );
}

/**
 * Get the prefix of an API key for display (first 8 characters + ...)
 * @param {string} apiKey - The API key
 * @returns {string} - The display prefix
 */
export function getApiKeyPrefix(apiKey) {
  if (!apiKey || apiKey.length < 8) {
    return '••••••••';
  }
  return apiKey.substring(0, 8) + '••••••••';
}

/**
 * Encrypt API key for storage (optional additional layer)
 * Uses AES-256-GCM
 */
export function encryptApiKey(apiKey) {
  if (!apiKey) return null;
  
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(HMAC_SECRET, 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * Decrypt API key from storage
 */
export function decryptApiKey(encryptedData) {
  if (!encryptedData || !encryptedData.encrypted) return null;
  
  try {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(HMAC_SECRET, 'salt', 32);
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error decrypting API key:', error);
    return null;
  }
}

