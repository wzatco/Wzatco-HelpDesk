# Google OAuth Setup for help.wzatco.com

## Verified Routes in Codebase

✅ **Confirmed files exist:**
- `pages/api/auth/[...nextauth].js` - NextAuth configuration (creates automatic routes)
- `pages/api/auth/widget-callback.js` - Widget-specific callback handler
- `pages/api/auth/signin.js` - Custom signin handler

✅ **Automatic routes created by NextAuth:**
- `/api/auth/callback/google` - Created automatically by NextAuth (via `[...nextauth].js`)
- `/api/auth/signin/google` - Created automatically by NextAuth

✅ **Custom routes:**
- `/api/auth/widget-callback` - Custom widget callback (file exists)

## Google Cloud Console Configuration

When creating Google OAuth credentials in the Google Cloud Console, use the following settings:

### Authorized JavaScript origins
For use with requests from a browser

Add the following origin:
```
https://help.wzatco.com
```

**Note:** 
- Use `https://` (not `http://`)
- Do NOT include a trailing slash
- Do NOT include any path after the domain

### Authorized redirect URIs

Add the following redirect URIs:

1. **NextAuth Standard Callback** (required - automatically created by NextAuth):
```
https://help.wzatco.com/api/auth/callback/google
```
   - This route is automatically created by NextAuth via `[...nextauth].js`
   - Google redirects here after OAuth authentication

2. **Widget Callback** (required for widget Google login):
```
https://help.wzatco.com/api/auth/widget-callback
```
   - This is a custom route (file: `pages/api/auth/widget-callback.js`)
   - NextAuth redirects here after successful authentication

**Note:**
- Use `https://` (not `http://`)
- Include the full path
- These are case-sensitive

## Summary

**Authorized JavaScript origins:**
- `https://help.wzatco.com`

**Authorized redirect URIs:**
- `https://help.wzatco.com/api/auth/callback/google`
- `https://help.wzatco.com/api/auth/widget-callback`

## How it works

**Authentication Flow:**
1. User clicks "Sign in with Google" in the widget
2. Widget opens popup to `/api/auth/signin/google?callbackUrl=/api/auth/widget-callback`
   - This route is automatically created by NextAuth (via `[...nextauth].js`)
3. NextAuth redirects to Google OAuth consent screen
4. Google redirects back to `/api/auth/callback/google` 
   - This route is automatically created by NextAuth
   - NextAuth processes the OAuth response here
5. NextAuth then redirects to `/api/auth/widget-callback` (custom handler)
   - File: `pages/api/auth/widget-callback.js`
6. Widget callback sends success message to parent window via `postMessage`
7. Widget closes popup and user is logged in

**Route Summary:**
- `/api/auth/signin/google` → NextAuth route (auto-created)
- `/api/auth/callback/google` → NextAuth route (auto-created, Google redirects here)
- `/api/auth/widget-callback` → Custom route (file exists, NextAuth redirects here)

## Environment Variables

Make sure these are set in your production environment:

```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
NEXTAUTH_URL=https://help.wzatco.com
NEXTAUTH_SECRET=your-secret-key-here
```

## Testing

After setting up the credentials:
1. Go to https://help.wzatco.com
2. Open the widget
3. Click "Sign in with Google"
4. Complete the OAuth flow
5. Verify the user is logged in

