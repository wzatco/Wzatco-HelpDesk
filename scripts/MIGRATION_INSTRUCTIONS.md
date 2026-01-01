# Data Migration Instructions: SQLite → MySQL

## Quick Start

### Step 1: Install Temporary SQLite Driver

```bash
npm install better-sqlite3
```

**Note:** This is a temporary dependency. You can remove it after migration with:
```bash
npm uninstall better-sqlite3
```

### Step 2: Verify Environment

Ensure your `.env` file has the MySQL connection string:
```env
DATABASE_URL="mysql://u394742293_HD_demo:Rohan_1025@82.180.140.4:3306/u394742293_HD_demo"
```

### Step 3: Run Migration

```bash
node scripts/migrate-data.js
```

---

## What the Script Does

1. **Connects** to SQLite database at `./prisma/dev.db`
2. **Connects** to MySQL database using `DATABASE_URL` from `.env`
3. **Migrates** data in the correct order to respect foreign key constraints:
   - **Phase 1:** Settings, Roles, Departments, Users, Agents, Customers, Products
   - **Phase 2:** Accessories, TicketTemplates, IssueCategories, Articles, etc.
   - **Phase 3:** Conversations (Tickets), LiveChats, SLATimers
   - **Phase 4:** Messages, Notes, Activities, Worklogs, etc.
4. **Converts** SQLite data types:
   - Booleans (0/1) → true/false
   - Timestamps → Date objects
   - JSON strings → Parsed JSON objects
5. **Handles** duplicates with `skipDuplicates: true`
6. **Logs** progress for each table

---

## Expected Output

```
🚀 Starting SQLite to MySQL data migration...

🔌 Testing SQLite connection...
✅ SQLite connected
🔌 Testing MySQL connection...
✅ MySQL connected

Migrating Settings...
  📦 Found 5 records
  ✅ Success: 5/5 records migrated

Migrating Role...
  📦 Found 3 records
  ✅ Success: 3/3 records migrated

...

============================================================
📊 Migration Summary
============================================================
  ✅ Settings: 5 records migrated
  ✅ Role: 3 records migrated
  ...
============================================================
✅ Total records migrated: 1234

🎉 Migration complete!

🔌 Connections closed
```

---

## Troubleshooting

### Error: "Cannot find module 'better-sqlite3'"
**Solution:** Run `npm install better-sqlite3`

### Error: "SQLite database not accessible"
**Solution:** Ensure `./prisma/dev.db` exists

### Error: "MySQL connection failed"
**Solution:** Verify `DATABASE_URL` in `.env` is correct

### Error: "Foreign key constraint failed"
**Solution:** The script handles this automatically by migrating in the correct order. If you see this, check the migration order in the script.

### Duplicate Entry Errors
**Solution:** The script uses `skipDuplicates: true`, so duplicates are automatically skipped. This is normal if you run the script multiple times.

---

## After Migration

1. **Verify Data:**
   ```bash
   npx prisma studio
   ```
   This opens Prisma Studio where you can browse your MySQL database.

2. **Remove Temporary Dependency:**
   ```bash
   npm uninstall better-sqlite3
   ```

3. **Backup SQLite Database (Optional):**
   ```bash
   cp prisma/dev.db prisma/dev.db.backup
   ```

---

## Notes

- The script preserves original IDs where possible
- Large tables are migrated in batches of 100 records
- If a batch fails, the script falls back to individual inserts
- Empty tables are skipped automatically
- Tables that don't exist in SQLite are skipped

