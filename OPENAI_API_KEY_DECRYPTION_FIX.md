# OpenAI API Key Decryption Issue - Fix Guide

## Problem
The error message shows: **"Incorrect API key provided: sk-proj-6m8A"**

This indicates the API key is being **truncated or corrupted** during decryption. The key "sk-proj-6m8A" is only 12 characters, but OpenAI API keys are typically 40-60 characters long (e.g., `sk-proj-...long-string`).

## Root Cause

The issue is **NOT directly caused by HMAC**, but by **HMAC_SECRET mismatch** between environments:

1. **Encryption uses HMAC_SECRET**: The `encryptApiKey()` function uses `HMAC_SECRET` (or `JWT_SECRET` as fallback) to derive the encryption key
2. **Decryption requires the SAME secret**: If `HMAC_SECRET` is different in production vs development, decryption will fail or produce corrupted data
3. **Result**: The decrypted key is truncated/corrupted, leading to the error

## How It Works

```javascript
// Encryption (in lib/crypto-utils.js)
const HMAC_SECRET = process.env.HMAC_SECRET || process.env.JWT_SECRET || 'default';
const key = crypto.scryptSync(HMAC_SECRET, 'salt', 32); // Derives key from secret
// ... encrypts API key using this derived key

// Decryption (in lib/crypto-utils.js)
const HMAC_SECRET = process.env.HMAC_SECRET || process.env.JWT_SECRET || 'default';
const key = crypto.scryptSync(HMAC_SECRET, 'salt', 32); // Must use SAME secret!
// ... decrypts API key using this derived key
```

**If HMAC_SECRET differs between encryption and decryption, the derived keys won't match, causing decryption to fail.**

## Solution

### Step 1: Verify HMAC_SECRET in Production

Check your production environment variables:

```bash
# In Hostinger or your production environment
HMAC_SECRET=<should-match-development>
# OR
JWT_SECRET=<should-match-development>
```

**Critical**: The `HMAC_SECRET` (or `JWT_SECRET` if used as fallback) **MUST be the same** in:
- Development environment (where you encrypted the key)
- Production environment (where you're trying to decrypt it)

### Step 2: Check Current Production Secret

1. **Log into your production server/Hostinger**
2. **Check environment variables**:
   - Look for `HMAC_SECRET` or `JWT_SECRET`
   - Note the value

### Step 3: Re-encrypt the API Key

If the secrets don't match, you have two options:

#### Option A: Set Matching Secret (Recommended)
1. **Set `HMAC_SECRET` in production** to match your development environment
2. **Restart the server**
3. The existing encrypted key should now decrypt correctly

#### Option B: Re-enter the API Key
1. **Go to Admin Panel → Settings → AI**
2. **Enter the OpenAI API key again** (this will re-encrypt it with the current production secret)
3. **Save**

### Step 4: Verify the Fix

After fixing, check server logs when using OpenAI:

**Expected logs (success):**
```
✅ OpenAI: Successfully decrypted API key (length: 51, prefix: sk-proj-6m8A...)
```

**Error logs (if still failing):**
```
❌ OpenAI: Decrypted key is too short (12 chars): sk-proj-6m8A...
❌ decryptApiKey: This usually means HMAC_SECRET mismatch between encryption and decryption!
```

## Enhanced Error Logging

I've added comprehensive error logging to help diagnose the issue:

### In `lib/crypto-utils.js`:
- ✅ Validates encrypted data structure
- ✅ Checks if HMAC_SECRET is set
- ✅ Provides specific error messages for common issues
- ✅ Warns if using default secret

### In `pages/api/widget/chat/openai.js`:
- ✅ Validates decrypted key length
- ✅ Checks if key starts with 'sk-'
- ✅ Logs detailed error information
- ✅ Prevents using corrupted keys

## Common Issues & Solutions

### Issue 1: "Decrypted key is too short"
**Cause**: HMAC_SECRET mismatch  
**Solution**: Ensure `HMAC_SECRET` is the same in both environments

### Issue 2: "Failed to decrypt API key - decryption returned null"
**Cause**: Corrupted encrypted data or wrong secret  
**Solution**: Re-enter the API key in Admin Settings

### Issue 3: "HMAC_SECRET is not set or using default value"
**Cause**: Using default/fallback secret  
**Solution**: Set `HMAC_SECRET` environment variable explicitly

### Issue 4: "Decrypted key does not start with 'sk-'"
**Cause**: Complete decryption failure  
**Solution**: Re-encrypt the key with correct secret

## Prevention

To prevent this issue in the future:

1. **Always set `HMAC_SECRET` explicitly** in all environments
2. **Use the same secret** across development, staging, and production
3. **Document the secret** in your deployment notes (securely)
4. **Test decryption** after deploying to a new environment

## Testing

After fixing, test the OpenAI integration:

1. **Go to widget chat**
2. **Send a message that triggers AI**
3. **Check server logs** for decryption success/failure
4. **Verify AI responses** are working

## Environment Variables Checklist

Ensure these are set in production:

```bash
# Required for API key encryption/decryption
HMAC_SECRET=<your-secret-key>
# OR (if HMAC_SECRET not set, JWT_SECRET is used as fallback)
JWT_SECRET=<your-secret-key>

# Both should be the same value for consistency
```

## Summary

**The issue is caused by HMAC_SECRET mismatch, not HMAC itself.** The encryption/decryption system requires the same secret in both environments. Fix by:

1. ✅ Ensuring `HMAC_SECRET` is set in production
2. ✅ Making sure it matches the development secret
3. ✅ Re-entering the API key if secrets don't match
4. ✅ Checking logs to verify successful decryption

