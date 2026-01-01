# Environment Variables Backup - Before MySQL Migration

**Date:** January 2025  
**Purpose:** Backup of environment configuration before migrating from SQLite/PostgreSQL to MySQL

---

## Current Database Configuration

### Primary Database URL (Currently Active)
```
DATABASE_URL="postgresql://neondb_owner:npg_iFHl5j3WPyQC@ep-crimson-base-ad14rm9i-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### Local SQLite Database URL (Commented/Alternative)
```
DATABASE_URL="file:./prisma/dev.db"
```

### JWT Secret
```
JWT_SECRET=f6da1e74a35dd310ca31f48d922f9da4ed45b25b5869100a099c2e522ac93e0357da8e7897552d33bd5f52cf030661a6de58744ae0cd5f7973143318f99e2453
```

---

## Migration Target

### New MySQL Database URL
```
DATABASE_URL="mysql://u394742293_HD_demo:Rohan_1025@82.180.140.4:3306/u394742293_HD_demo"
```

**Host:** 82.180.140.4  
**Port:** 3306  
**Database:** u394742293_HD_demo  
**User:** u394742293_HD_demo  
**Password:** Rohan_1025

---

## Rollback Instructions

If you need to revert to the previous configuration:

1. **Restore .env file:**
   ```bash
   # Copy the DATABASE_URL from this backup back to .env
   DATABASE_URL="postgresql://neondb_owner:npg_iFHl5j3WPyQC@ep-crimson-base-ad14rm9i-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
   ```

2. **Restore Prisma Schema:**
   - Change `provider = "mysql"` back to `provider = "postgresql"` or `provider = "sqlite"`
   - Remove `relationMode = "prisma"` from datasource
   - Remove `@db.Text` attributes (if reverting to PostgreSQL/SQLite)

3. **Regenerate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

4. **Restore Migrations (if needed):**
   - If you have a backup of the `prisma/migrations` folder, restore it
   - Run: `npm run prisma:migrate:deploy`

---

## Notes

- This backup was created before migrating from PostgreSQL/SQLite to MySQL
- The JWT_SECRET should remain the same (no change needed)
- All other environment variables (if any) should remain unchanged
- Database data migration may be required separately if you need to preserve existing data

---

**⚠️ IMPORTANT:** Keep this file secure and do not commit it to version control if it contains sensitive information.

