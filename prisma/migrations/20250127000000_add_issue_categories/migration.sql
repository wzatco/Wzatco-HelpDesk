-- CreateTable
CREATE TABLE "IssueCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "IssueCategory_name_key" ON "IssueCategory"("name");

-- CreateIndex
CREATE INDEX "IssueCategory_isActive_idx" ON "IssueCategory"("isActive");

-- CreateIndex
CREATE INDEX "IssueCategory_order_idx" ON "IssueCategory"("order");

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "issueCategoryId" TEXT;

-- CreateIndex
CREATE INDEX "Conversation_issueCategoryId_idx" ON "Conversation"("issueCategoryId");

