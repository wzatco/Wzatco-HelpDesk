import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import prisma from '../../../lib/prisma';

// Helper function to get Google OAuth credentials
async function getGoogleCredentials() {
  try {
    // Try to fetch from database first
    const settings = await prisma.settings.findFirst({
      where: { category: 'integrations' }
    });

    if (settings && settings.isGoogleAuthEnabled && settings.googleClientId && settings.googleClientSecret) {
      console.log('✅ Using Google credentials from database');
      return {
        clientId: settings.googleClientId,
        clientSecret: settings.googleClientSecret
      };
    }
  } catch (error) {
    console.error('❌ Error fetching Google credentials from database:', error);
  }

  // Fallback to environment variables
  console.log('⚠️ Using Google credentials from environment variables');
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
  };
}

// Build auth options with credentials
async function getAuthOptions() {
  const credentials = await getGoogleCredentials();
  
  console.log('🔑 Building auth options with credentials:', {
    hasClientId: !!credentials.clientId,
    hasClientSecret: !!credentials.clientSecret,
    clientIdLength: credentials.clientId?.length || 0,
    clientIdPreview: credentials.clientId?.substring(0, 20)
  });
  
  if (!credentials.clientId || !credentials.clientSecret || credentials.clientId.length < 10) {
    console.error('❌ Invalid Google OAuth credentials!');
    throw new Error('Google OAuth not configured properly');
  }
  
  return {
    providers: [
      GoogleProvider({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        authorization: {
          params: {
            prompt: "select_account",
          }
        }
      }),
    ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (account.provider === 'google') {
          const email = user.email.toLowerCase();
          const name = user.name || profile.name || email.split('@')[0];

          // Check if customer exists
          let customer = await prisma.customer.findUnique({
            where: { email }
          });

          if (!customer) {
            // Auto-create new customer
            customer = await prisma.customer.create({
              data: {
                email,
                name,
                // Optional: Store Google profile info
                // avatarUrl: user.image,
                // phone: profile.phone || null,
              }
            });

            console.log('✅ New customer created via Google Auth:', customer.id, email);
          } else {
            console.log('✅ Existing customer found:', customer.id, email);
          }

          // Store customer ID in user object for session callback
          user.customerId = customer.id;
          user.customerName = customer.name;
        }

        return true;
      } catch (error) {
        console.error('❌ Error in signIn callback:', error);
        return false;
      }
    },

    async session({ session, token }) {
      // Add customer info to session
      if (token.customerId) {
        session.user.customerId = token.customerId;
        session.user.customerName = token.customerName;
      }
      return session;
    },

    async jwt({ token, user }) {
      // Persist customer ID in JWT token
      if (user) {
        token.customerId = user.customerId;
        token.customerName = token.customerName;
      }
      return token;
    },

    async redirect({ url, baseUrl }) {
      console.log('🔀 NextAuth redirect:', { url, baseUrl });
      
      // Parse the URL to check callback
      try {
        const urlObj = new URL(url, baseUrl);
        
        // If widget-callback is in the path or callbackUrl parameter
        if (url.includes('/api/auth/widget-callback') || 
            urlObj.searchParams.get('callbackUrl')?.includes('/api/auth/widget-callback')) {
          
          // Extract the actual callbackUrl from query params if present
          const callbackUrl = urlObj.searchParams.get('callbackUrl');
          if (callbackUrl) {
            console.log('✅ Redirecting to widget-callback:', callbackUrl);
            return callbackUrl;
          }
          
          return url;
        }
      } catch (e) {
        console.error('Error parsing redirect URL:', e);
      }

      // Default redirect behavior
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      return baseUrl;
    }
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production',
  };
}

// Custom handler to support dynamic credentials from database
export default async function handler(req, res) {
  const authOptions = await getAuthOptions();
  return await NextAuth(req, res, authOptions);
}
