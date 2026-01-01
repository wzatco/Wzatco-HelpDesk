# Favicon Setup Guide

## Source Image
**URL:** https://wzatco.com/wp-content/uploads/2025/08/cropped-Brand.webp

## Steps to Add Favicon

### Option 1: Manual Download (Recommended)

1. **Download the favicon:**
   - Open: https://wzatco.com/wp-content/uploads/2025/08/cropped-Brand.webp
   - Save the image as `favicon.ico` or `favicon.png`

2. **Place in public folder:**
   ```
   public/
     ├── favicon.ico (or favicon.png)
     ├── apple-touch-icon.png (optional, 180x180)
     └── icon.png (optional, for modern browsers)
   ```

3. **Update your pages:**
   The favicon should be automatically detected by Next.js from the `public/` folder.

### Option 2: Use Online Favicon Generator

1. Download the image from the URL above
2. Go to: https://realfavicongenerator.net/
3. Upload the downloaded image
4. Generate all favicon sizes
5. Download the generated package
6. Extract all files to `public/` folder

### Required Files for Complete Support

```
public/
  ├── favicon.ico           # Main favicon (16x16, 32x32)
  ├── favicon-16x16.png     # 16x16 PNG
  ├── favicon-32x32.png     # 32x32 PNG
  ├── apple-touch-icon.png  # 180x180 for iOS
  ├── android-chrome-192x192.png  # 192x192 for Android
  └── android-chrome-512x512.png  # 512x512 for Android
```

### Next.js Metadata Configuration

The favicon will be automatically detected if placed in `public/` with standard naming.

For advanced configuration, you can update your root layout or `_app.js`:

```javascript
// pages/_app.js or app/layout.js
export const metadata = {
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
}
```

## Quick Test

After adding the favicon:

1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh your site (Ctrl+F5)
3. Check browser tab for the new icon

## Production Deployment

After adding favicon files:

```bash
git add public/favicon.*
git commit -m "Add WZATCO favicon"
git push origin main
```

Hostinger will automatically include these files in the build.

---

**Note:** The favicon from https://wzatco.com/wp-content/uploads/2025/08/cropped-Brand.webp is a WebP format. You may need to convert it to ICO or PNG format for best compatibility across all browsers.

