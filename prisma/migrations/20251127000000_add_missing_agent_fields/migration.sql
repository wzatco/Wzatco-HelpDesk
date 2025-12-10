-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "accountId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "slug" TEXT NOT NULL,
    "departmentId" TEXT,
    "roleId" TEXT,
    "skills" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxLoad" INTEGER,
    "presenceStatus" TEXT NOT NULL DEFAULT 'offline',
    "lastSeenAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Agent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Agent_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Agent_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Generate slugs for existing agents based on their names
-- Copy data from old Agent table to new Agent table
INSERT INTO "new_Agent" ("id", "userId", "name", "email", "createdAt", "updatedAt", "slug", "accountId", "departmentId", "roleId", "skills", "isActive", "maxLoad", "presenceStatus", "lastSeenAt")
SELECT 
    "id", 
    "userId", 
    "name", 
    "email", 
    "createdAt", 
    "updatedAt",
    LOWER(REPLACE(REPLACE(REPLACE("name", ' ', '-'), '.', '-'), '_', '-')) || '-' || substr("id", 1, 8) as "slug",
    NULL as "accountId",
    NULL as "departmentId",
    NULL as "roleId",
    NULL as "skills",
    true as "isActive",
    NULL as "maxLoad",
    'offline' as "presenceStatus",
    NULL as "lastSeenAt"
FROM "Agent";

DROP TABLE "Agent";
ALTER TABLE "new_Agent" RENAME TO "Agent";

-- CreateIndex
CREATE UNIQUE INDEX "Agent_userId_key" ON "Agent"("userId");
CREATE UNIQUE INDEX "Agent_accountId_key" ON "Agent"("accountId");
CREATE UNIQUE INDEX "Agent_email_key" ON "Agent"("email");
CREATE UNIQUE INDEX "Agent_slug_key" ON "Agent"("slug");
CREATE INDEX "Agent_departmentId_idx" ON "Agent"("departmentId");
CREATE INDEX "Agent_roleId_idx" ON "Agent"("roleId");
CREATE INDEX "Agent_slug_idx" ON "Agent"("slug");
CREATE INDEX "Agent_presenceStatus_idx" ON "Agent"("presenceStatus");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

