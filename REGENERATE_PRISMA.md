# Prisma Client Regeneration Required

## Issue
The Prisma client is out of sync with the schema after adding new fields (`password`, `passwordResetToken`, `passwordResetExpiry`) to the User model.

## Solution

### Option 1: Restart Dev Server (Recommended)
1. Stop your Next.js dev server (Ctrl+C)
2. Restart it with `npm run dev`
3. Next.js will automatically regenerate Prisma client on startup

### Option 2: Manual Regeneration
1. Stop your Next.js dev server
2. Run: `npx prisma generate`
3. Restart your dev server

### Option 3: If files are locked
1. Close all terminals/editors using Prisma
2. Stop the dev server
3. Run: `npx prisma generate`
4. Restart dev server

## What Changed
- Added `password` field to User model
- Added `passwordResetToken` field to User model  
- Added `passwordResetExpiry` field to User model

These fields are now available in Prisma queries after regeneration.

