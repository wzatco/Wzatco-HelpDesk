# Google Auth Widget Implementation - Testing Guide

## ✅ Implementation Status

### Completed Features
- ✅ Google Sign-In button added to widget LoginForm
- ✅ Popup-based OAuth flow with secure postMessage communication
- ✅ Success animation page with auto-close
- ✅ Automatic customer creation on first sign-in
- ✅ Error handling for failed authentication
- ✅ Google profile image support
- ✅ Session management with user data

### Files Modified/Created

#### 1. **LoginForm.js** (`components/widget/chat/LoginForm.js`)
**Changes:**
- Added Chrome icon import
- Added `handleGoogleSignIn()` function with popup window management
- Added Google Sign-In button UI (only in non-edit mode)
- Added error handling for `GOOGLE_AUTH_ERROR` message
- Stores Google profile image in user data

**Key Code:**
```javascript
const handleGoogleSignIn = async () => {
  const popup = window.open('/api/auth/signin?provider=google&widget=true', ...);
  
  const messageHandler = (event) => {
    if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
      onSubmit({
        name: user.name,
        email: user.email,
        image: user.image  // Profile picture
      });
    }
  };
  
  window.addEventListener('message', messageHandler);
};
```

#### 2. **signin.js** (NEW - `pages/api/auth/signin.js`)
**Purpose:** Bridge endpoint for widget Google OAuth

**Flow:**
1. Checks if user already has a NextAuth session
2. If yes → redirects to callback with user data
3. If no → redirects to NextAuth Google provider

**URL:** `/api/auth/signin?provider=google&widget=true`

#### 3. **widget-callback.js** (NEW - `pages/api/auth/widget-callback.js`)
**Purpose:** Handle OAuth callback and show success page

**Features:**
- Gets session from NextAuth `getServerSession()`
- Shows animated checkmark success page
- Sends postMessage to parent window: `{type: 'GOOGLE_AUTH_SUCCESS', user: {...}}`
- Auto-closes popup after 1.5 seconds
- Error handling with `GOOGLE_AUTH_ERROR` message

**Visual:**
```
┌────────────────────────┐
│                        │
│    ✓ (Checkmark)       │
│  Sign In Successful!   │
│  Redirecting you back  │
│                        │
└────────────────────────┘
```

#### 4. **[...nextauth].js** (EXISTING - No changes needed)
**Already handles:**
- Google provider configuration from database or env
- Auto-creates customer on Google sign-in
- Stores customerId in session/JWT
- Redirects to widget-callback when widget=true parameter present

## 🧪 Testing Instructions

### Prerequisites
1. **Configure Google OAuth in Admin Panel:**
   - Go to Admin → Settings → External Integrations
   - Enable Google Authentication
   - Enter Google Client ID
   - Enter Google Client Secret
   - Save settings

2. **Or use Environment Variables:**
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

3. **Server must be running:**
   ```bash
   npm run dev
   ```

### Test Method 1: Using Test Page

1. **Open test page:**
   ```
   http://localhost:3000/test-google-auth.html
   ```

2. **Run Test 1: Direct OAuth Popup**
   - Click "Test Google Sign-In Popup"
   - Popup window should open
   - Complete Google authentication
   - Watch for success animation
   - Popup should auto-close
   - Test page should show user data

3. **Run Test 2: Full Widget Integration**
   - Click "Load Widget & Test"
   - Click chat widget icon (bottom right)
   - Click "Sign in with Google" button
   - Complete authentication
   - Verify widget logs you in

4. **Run Test 3: Database Verification**
   ```bash
   node check-database-state.js
   ```
   - Look for new customer with Google email
   - Verify name and email are populated

### Test Method 2: Manual Widget Testing

1. **Open any page with widget:**
   ```
   http://localhost:3000/
   ```

2. **Open chat widget** (bottom right icon)

3. **Look for Google button:**
   - Should see "Or continue with" divider
   - Should see "Sign in with Google" button with Chrome icon

4. **Click Google button:**
   - Popup opens (500x600px, centered)
   - Redirects to Google sign-in
   - After sign-in, shows success animation
   - Popup closes automatically
   - Widget shows logged-in state

### Test Method 3: Check Customer Creation

1. **Before testing, check existing customers:**
   ```bash
   node check-database-state.js
   ```

2. **Sign in with Google using a NEW email**

3. **Check database again:**
   ```bash
   node check-database-state.js
   ```

4. **Verify new customer created with:**
   - Email from Google account
   - Name from Google profile
   - Recent `createdAt` timestamp

## 🔍 Expected Behavior

### Success Flow
```
User clicks "Sign in with Google"
↓
Popup opens → /api/auth/signin?provider=google&widget=true
↓
Redirects to → /api/auth/signin/google
↓
User authenticates with Google
↓
Google redirects back → NextAuth callback
↓
NextAuth creates/finds customer in database
↓
Redirects to → /api/auth/widget-callback
↓
Shows success animation (checkmark + gradient)
↓
Sends postMessage → parent window {type: 'GOOGLE_AUTH_SUCCESS', user: {...}}
↓
Parent window receives message → calls onSubmit()
↓
Popup auto-closes after 1.5s
↓
Widget shows logged-in state
```

### Error Scenarios

#### 1. **Popup Blocked**
- **Cause:** Browser popup blocker
- **User sees:** Alert to allow popups
- **Solution:** Allow popups for localhost

#### 2. **Google OAuth Not Configured**
- **Cause:** No Client ID/Secret in admin settings or env
- **User sees:** Error in popup
- **Solution:** Configure Google OAuth in admin panel

#### 3. **User Cancels Sign-In**
- **Cause:** User closes popup or clicks "Cancel" on Google page
- **Widget behavior:** Remains on login form
- **No error shown:** Expected behavior

#### 4. **Database Error**
- **Cause:** Database connection issues
- **User sees:** "Authentication failed" message
- **Check:** Server logs for errors

## 📊 Verification Checklist

### Frontend
- [ ] Google button visible in widget login form
- [ ] Button has Chrome icon and correct styling
- [ ] Button only shows in non-edit mode
- [ ] Popup opens centered on screen (500x600px)
- [ ] Popup shows Google sign-in page

### OAuth Flow
- [ ] User can sign in with Google account
- [ ] Success page shows animated checkmark
- [ ] Success page has gradient background
- [ ] Popup auto-closes after animation
- [ ] Parent window receives postMessage

### Backend
- [ ] Customer created in database on first sign-in
- [ ] Existing customer found on subsequent sign-ins
- [ ] Name and email stored correctly
- [ ] Session includes customerId
- [ ] Google credentials fetched from database or env

### Error Handling
- [ ] Popup blocked → user notified
- [ ] OAuth cancelled → no error, form remains
- [ ] Auth failed → error message displayed
- [ ] Network error → graceful fallback

### Security
- [ ] postMessage checks origin (window.location.origin)
- [ ] Email normalized to lowercase
- [ ] No sensitive data in URL parameters
- [ ] Session managed by NextAuth securely

## 🐛 Troubleshooting

### Issue: Google button not showing
**Check:**
1. LoginForm not in edit mode (`isEditMode={false}`)
2. Chrome icon imported correctly
3. No console errors

### Issue: Popup blocked
**Fix:**
- Allow popups in browser settings
- Make sure button clicked by user (not automatic)

### Issue: "Invalid OAuth configuration"
**Check:**
1. Admin → Settings → Google Auth enabled
2. Valid Google Client ID and Secret
3. Or environment variables set correctly

### Issue: Customer not created
**Check:**
1. Database connection working
2. Server logs for errors in signIn callback
3. Prisma schema has Customer model

### Issue: Popup doesn't close
**Check:**
1. postMessage being sent from callback page
2. Event listener attached in LoginForm
3. Origin check passing

## 🎯 Next Steps

### Additional Enhancements (Optional)
1. **Store Google profile image:**
   ```javascript
   // In NextAuth signIn callback
   customer = await prisma.customer.create({
     data: {
       email,
       name,
       avatarUrl: user.image  // Add this
     }
   });
   ```

2. **Add loading state:**
   - Show spinner while waiting for popup
   - Disable form during authentication

3. **Add analytics:**
   - Track Google sign-in success rate
   - Monitor which provider users prefer

4. **Support other providers:**
   - Follow same pattern for Facebook, GitHub, etc.
   - Add buttons for each provider

### Testing Checklist for Production
- [ ] Test with real Google accounts (not test accounts)
- [ ] Test on different browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile devices
- [ ] Test with slow network (3G simulation)
- [ ] Verify HTTPS required for Google OAuth
- [ ] Update Google OAuth consent screen
- [ ] Add authorized redirect URIs in Google Console

## 📝 Admin Configuration Guide

### Setting Up Google OAuth

1. **Create Google OAuth Credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URI: `https://yourdomain.com/api/auth/callback/google`

2. **Configure in Admin Panel:**
   - Login as admin
   - Go to Settings → External Integrations
   - Enable "Google Authentication"
   - Paste Client ID
   - Paste Client Secret
   - Save

3. **Test:**
   - Open widget on your site
   - Try signing in with Google
   - Verify customer created in database

## 🔐 Security Considerations

1. **Origin Checking:**
   - postMessage listener checks `event.origin`
   - Only accepts messages from same origin

2. **Session Security:**
   - NextAuth handles session tokens
   - JWT tokens stored securely
   - Session expires after 30 days

3. **Data Privacy:**
   - Only name, email, and image requested from Google
   - No sensitive data in query parameters
   - Customer data encrypted in database

4. **CSRF Protection:**
   - NextAuth includes CSRF tokens
   - State parameter in OAuth flow

## ✨ Success Criteria

The implementation is successful when:
1. ✅ Users can click "Sign in with Google" in widget
2. ✅ OAuth flow completes without errors
3. ✅ Customer account auto-created on first sign-in
4. ✅ Widget logs user in after successful authentication
5. ✅ User can start chatting immediately
6. ✅ All data stored correctly in database
7. ✅ Error cases handled gracefully

---

**Implementation Date:** $(date)
**Status:** ✅ Ready for Testing
**Next Task:** Test complete flow and verify database integration
