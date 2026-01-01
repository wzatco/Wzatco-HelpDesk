import prisma, { ensurePrismaConnected } from '../../../../lib/prisma';
import { getSecuritySettings } from '../../../../lib/settings';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Store failed login attempts in memory (in production, use Redis or database)
const failedAttempts = new Map(); // email -> { count: number, lockedUntil: Date }
const requestRateLimit = new Map(); // ip -> { count: number, resetAt: Date }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await ensurePrismaConnected();
    const { email, password } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';

    // Get security settings (with fallback if database fails)
    let securitySettings;
    try {
      securitySettings = await getSecuritySettings();
    } catch (error) {
      console.error('Error fetching security settings:', error);
      // Use default settings if database query fails
      securitySettings = {
        adminLoginSecurity: false,
        dosProtection: false,
        accountLockEnabled: false,
        accountLockAttempts: 5,
        accountLockMinutes: 15
      };
    }

    // Check if admin login security is enabled
    if (!securitySettings.adminLoginSecurity) {
      // If security is disabled, proceed without security checks
      // (This is not recommended for production)
    } else {
      // DoS Protection - Rate limiting
      if (securitySettings.dosProtection) {
        const now = new Date();
        const rateLimit = requestRateLimit.get(clientIp);
        
        if (rateLimit) {
          if (rateLimit.resetAt > now) {
            if (rateLimit.count >= 10) { // Max 10 requests per minute per IP
              return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.'
              });
            }
            rateLimit.count++;
          } else {
            // Reset counter
            requestRateLimit.set(clientIp, {
              count: 1,
              resetAt: new Date(now.getTime() + 60 * 1000) // 1 minute window
            });
          }
        } else {
          requestRateLimit.set(clientIp, {
            count: 1,
            resetAt: new Date(now.getTime() + 60 * 1000)
          });
        }
      }

      // Check account lock
      if (securitySettings.accountLockEnabled) {
        const attemptData = failedAttempts.get(email);
        const now = new Date();

        if (attemptData && attemptData.lockedUntil > now) {
          const minutesRemaining = Math.ceil((attemptData.lockedUntil - now) / 1000 / 60);
          return res.status(423).json({
            success: false,
            message: `Account is temporarily locked. Please try again in ${minutesRemaining} minute(s).`,
            lockedUntil: attemptData.lockedUntil
          });
        }
      }
    }

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find admin by email
    let admin;
    try {
      admin = await prisma.admin.findUnique({
        where: { email: email.toLowerCase() }
      });
    } catch (dbError) {
      console.error('Database error finding admin:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Database connection error. Please check your database configuration.'
      });
    }

    if (!admin) {
      // Increment failed attempts
      if (securitySettings.accountLockEnabled) {
        incrementFailedAttempts(email, securitySettings);
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password (assuming password is hashed with bcrypt)
    // Note: In production, ensure passwords are properly hashed
    const isValidPassword = await bcrypt.compare(password, admin.password || '');

    if (!isValidPassword) {
      // Increment failed attempts
      if (securitySettings.accountLockEnabled) {
        incrementFailedAttempts(email, securitySettings);
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Successful login - clear failed attempts
    failedAttempts.delete(email);

    // Find or create User record for this admin
    let user = await prisma.user.findUnique({
      where: { email: admin.email.toLowerCase() },
      include: {
        role: {
          select: {
            id: true,
            title: true,
            displayAs: true,
            hasSuperPower: true
          }
        }
      }
    });

    // If user doesn't exist, create one
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: admin.name,
          email: admin.email.toLowerCase(),
          phone: admin.phone,
          avatarUrl: admin.avatarUrl,
          type: 'admin',
          status: 'active'
        },
        include: {
          role: {
            select: {
              id: true,
              title: true,
              displayAs: true,
              hasSuperPower: true
            }
          }
        }
      });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        roleId: user.roleId,
        type: user.type,
        adminId: admin.id
      },
      jwtSecret,
      { expiresIn: '15d' } // Token expires in 15 days
    );

    // Set httpOnly cookie for server-side authentication with more aggressive settings
    const cookieMaxAge = 15 * 24 * 60 * 60; // 15 days in seconds
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Set cookie with explicit settings to prevent clearing
    const cookieString = [
      `authToken=${token}`,
      'HttpOnly',
      'Path=/',
      `Max-Age=${cookieMaxAge}`,
      'SameSite=Lax',
      isProduction ? 'Secure' : ''
    ].filter(Boolean).join('; ');
    
    res.setHeader('Set-Cookie', cookieString);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        type: user.type,
        roleId: user.roleId,
        role: user.role
      },
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

function incrementFailedAttempts(email, securitySettings) {
  const attemptData = failedAttempts.get(email) || { count: 0 };
  attemptData.count++;

  if (attemptData.count >= securitySettings.accountLockAttempts) {
    // Lock account
    const lockDuration = securitySettings.accountLockMinutes * 60 * 1000; // Convert to milliseconds
    attemptData.lockedUntil = new Date(Date.now() + lockDuration);
  }

  failedAttempts.set(email, attemptData);
}

