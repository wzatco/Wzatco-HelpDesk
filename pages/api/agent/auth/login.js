import prisma, { ensurePrismaConnected } from '../../../../lib/prisma';
import { getSecuritySettings } from '../../../../lib/settings';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Get JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET is not set in environment variables. Using fallback secret (NOT SECURE FOR PRODUCTION).');
}

// Store failed login attempts in memory (in production, use Redis or database)
const failedAttempts = new Map(); // email -> { count: number, lockedUntil: Date }
const requestRateLimit = new Map(); // ip -> { count: number, resetAt: Date }

function incrementFailedAttempts(email, securitySettings) {
  const attemptData = failedAttempts.get(email) || { count: 0 };
  attemptData.count++;
  
  if (attemptData.count >= securitySettings.accountLockAttempts) {
    const lockMinutes = securitySettings.accountLockMinutes || 15;
    attemptData.lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
  }
  
  failedAttempts.set(email, attemptData);
}

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

    // Find agent by email (check both Agent.email and User.email via account relation)
    // Department Heads are Agents and can login through this endpoint
    let agent;
    try {
      // First try to find by Agent.email
      agent = await prisma.agent.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          account: {
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
          },
          department: {
            select: {
              id: true,
              name: true
            }
          },
          role: {
            select: {
              id: true,
              title: true,
              displayAs: true
            }
          },
          managedDepartments: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // If not found by Agent.email, try to find by User.email and then get Agent
      if (!agent) {
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: {
            agent: {
              include: {
                department: {
                  select: {
                    id: true,
                    name: true
                  }
                },
                role: {
                  select: {
                    id: true,
                    title: true,
                    displayAs: true
                  }
                },
                managedDepartments: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            },
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

        if (user && user.agent) {
          agent = {
            ...user.agent,
            account: user
          };
        }
      }
    } catch (dbError) {
      console.error('Database error finding agent:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Database connection error. Please check your database configuration.'
      });
    }

    if (!agent) {
      // Increment failed attempts
      if (securitySettings.accountLockEnabled) {
        incrementFailedAttempts(email, securitySettings);
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if agent is active
    // Note: Department Heads are Agents and can login through this endpoint
    if (agent.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact Administrator.'
      });
    }

    // Check if password is set
    if (!agent.account || !agent.account.password) {
      return res.status(401).json({
        success: false,
        message: 'Password not set. Please check your email for the password setup link or contact your administrator.'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, agent.account.password);

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

    // Update agent's last seen time
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        lastSeenAt: new Date(),
        presenceStatus: 'online'
      }
    });

    // Generate JWT token using environment variable
    const secret = JWT_SECRET || 'your-secret-key-change-in-production';
    const token = jwt.sign(
      {
        id: agent.id,
        email: agent.email || agent.account?.email,
        name: agent.name,
        type: 'agent',
        departmentId: agent.departmentId,
        roleId: agent.roleId || agent.account?.roleId
      },
      secret,
      { expiresIn: '15d' }
    );

    // Prepare user data for response
    // Include managedDepartments to identify Department Heads
    const userData = {
      id: agent.id,
      email: agent.email || agent.account?.email,
      name: agent.name,
      type: 'agent',
      slug: agent.slug,
      departmentId: agent.departmentId,
      department: agent.department,
      roleId: agent.roleId || agent.account?.roleId,
      role: agent.role || agent.account?.role,
      avatarUrl: agent.account?.avatarUrl,
      isActive: agent.isActive,
      presenceStatus: 'online',
      isDepartmentHead: agent.managedDepartments && agent.managedDepartments.length > 0,
      managedDepartments: agent.managedDepartments || []
    };

    // Set HTTP-only cookie for server-side authentication
    res.setHeader('Set-Cookie', [
      `agentAuthToken=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${24 * 60 * 60}; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`
    ]);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Agent login error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again.'
    });
  }
}

