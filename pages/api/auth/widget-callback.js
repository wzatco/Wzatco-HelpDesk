// Widget Google OAuth Callback Handler
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check for error parameter from NextAuth
    const { error } = req.query;
    
    if (error) {
      return res.status(400).send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ 
                type: 'GOOGLE_AUTH_ERROR', 
                error: 'Google authentication failed. Please check your configuration.' 
              }, window.location.origin);
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `);
    }

    // Get JWT token from cookies
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production'
    });

    if (!token || !token.email) {
      return res.status(400).send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ 
                type: 'GOOGLE_AUTH_ERROR', 
                error: 'No user session found' 
              }, window.location.origin);
              setTimeout(() => window.close(), 1000);
            </script>
          </body>
        </html>
      `);
    }

    const userData = {
      name: token.name,
      email: token.email,
      image: token.picture
    };

    // Send success message to parent window
    res.status(200).send(`
      <html>
        <head>
          <title>Sign In Successful</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 2rem;
            }
            .checkmark {
              width: 80px;
              height: 80px;
              border-radius: 50%;
              display: block;
              stroke-width: 3;
              stroke: white;
              stroke-miterlimit: 10;
              margin: 0 auto 1rem;
              box-shadow: inset 0px 0px 0px white;
              animation: fill 0.4s ease-in-out 0.4s forwards, scale 0.3s ease-in-out 0.9s both;
            }
            .checkmark__circle {
              stroke-dasharray: 166;
              stroke-dashoffset: 166;
              stroke-width: 3;
              stroke-miterlimit: 10;
              stroke: white;
              fill: none;
              animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
            }
            .checkmark__check {
              transform-origin: 50% 50%;
              stroke-dasharray: 48;
              stroke-dashoffset: 48;
              animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
            }
            @keyframes stroke {
              100% { stroke-dashoffset: 0; }
            }
            @keyframes scale {
              0%, 100% { transform: none; }
              50% { transform: scale3d(1.1, 1.1, 1); }
            }
            @keyframes fill {
              100% { box-shadow: inset 0px 0px 0px 30px white; }
            }
            h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
            p { margin: 0; opacity: 0.9; font-size: 0.875rem; }
          </style>
        </head>
        <body>
          <div class="container">
            <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
              <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
            <h1>Sign In Successful!</h1>
            <p>Redirecting you back...</p>
          </div>
          <script>
            const userData = ${JSON.stringify(userData)};
            window.opener.postMessage({ 
              type: 'GOOGLE_AUTH_SUCCESS', 
              user: userData 
            }, window.location.origin);
            setTimeout(() => window.close(), 1500);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Widget callback error:', error);
    res.status(500).send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ 
              type: 'GOOGLE_AUTH_ERROR', 
              error: 'Authentication failed' 
            }, window.location.origin);
            setTimeout(() => window.close(), 1000);
          </script>
        </body>
      </html>
    `);
  }
}
