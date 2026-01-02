# Production Build 404 Errors - Fix Guide

## Problem
Getting 404 errors for Next.js build files in production:
- `_app-*.js` - Next.js app bundle
- `_buildManifest.js` - Build manifest
- `_ssgManifest.js` - SSG manifest
- `8984-*.js` - Chunk files
- `favicon.ico` - Favicon

## Root Cause
The `.next/` folder (which contains all build files) is in `.gitignore` and must be generated on the production server by running `npm run build`.

## Solution

### 1. Ensure Build Runs in Production

**On Hostinger/Production Server:**
1. Make sure `npm run build` is executed during deployment
2. Verify the `.next/` folder exists after build
3. Ensure the build completes successfully

**Check Build Script:**
```json
"build": "prisma generate && next build"
```

### 2. Verify Build Output

After running `npm run build`, you should see:
```
✅ Compiled successfully
✅ Linting and checking validity of types
✅ Collecting page data
✅ Generating static pages
✅ Finalizing page optimization
```

And the `.next/` folder should contain:
- `static/` - Static assets
- `server/` - Server-side code
- `BUILD_ID` - Build identifier
- Various manifest files

### 3. Favicon Fix

A favicon.ico file should be placed in the `public/` folder. The app now includes favicon links in `_app.js`.

**To add a favicon:**
1. Create or download a favicon.ico file
2. Place it in the `public/` folder
3. Optionally add other sizes:
   - `favicon-32x32.png`
   - `favicon-16x16.png`
   - `apple-touch-icon.png`

### 4. Hostinger Deployment Checklist

**Before deploying:**
- [ ] Code is pushed to git
- [ ] Environment variables are set in Hostinger
- [ ] Build script is configured to run automatically

**During deployment:**
- [ ] Hostinger runs `npm install`
- [ ] Hostinger runs `npm run build` (or your build command)
- [ ] Build completes without errors
- [ ] `.next/` folder is created

**After deployment:**
- [ ] Check server logs for "✅ Next.js app prepared successfully"
- [ ] Verify `.next/` folder exists
- [ ] Test the site - no 404 errors for build files

### 5. Manual Build (If Needed)

If Hostinger doesn't auto-build, you may need to:

1. **SSH into server** (if available)
2. **Navigate to project directory**
3. **Run:**
   ```bash
   npm install
   npm run build
   npm start
   ```

### 6. Verify Build Files Are Served

The custom server (`server.js`) uses Next.js's `handle()` function which should automatically serve:
- Static files from `.next/static/`
- Build manifests
- All Next.js generated files

If files are still 404ing:
1. Check that `app.prepare()` completed successfully
2. Verify `.next/` folder exists and has content
3. Check file permissions on `.next/` folder
4. Verify the server is running in production mode (`NODE_ENV=production`)

## Configuration Updates

### next.config.js
- Added `generateBuildId` for consistent build IDs
- Added `compress: true` for better performance
- Disabled `poweredByHeader` for security

### pages/_app.js
- Added favicon links in Head component
- Will gracefully handle missing favicon files

## Testing

After fixing, check browser console:
- ✅ No 404 errors for `_app-*.js`
- ✅ No 404 errors for `_buildManifest.js`
- ✅ No 404 errors for `_ssgManifest.js`
- ✅ No 404 errors for chunk files
- ✅ Favicon loads (or at least doesn't 404)

## Common Issues

### Issue 1: Build Not Running
**Symptom:** All build files 404  
**Solution:** Ensure `npm run build` runs during deployment

### Issue 2: Build Fails
**Symptom:** Build errors in logs  
**Solution:** Check build logs, fix errors, ensure all dependencies are installed

### Issue 3: .next Folder Missing
**Symptom:** Build completes but .next folder doesn't exist  
**Solution:** Check build output, verify build actually completed

### Issue 4: Permissions Issue
**Symptom:** Build files exist but return 403  
**Solution:** Check file permissions on `.next/` folder

## Next Steps

1. **Verify build runs in production**
2. **Check server logs** for build completion
3. **Test the site** - should have no 404 errors
4. **Add favicon.ico** to public folder (optional but recommended)

