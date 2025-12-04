-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "category" TEXT DEFAULT 'WZATCO';
ALTER TABLE "Conversation" ADD COLUMN "customerName" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "priority" TEXT DEFAULT 'low';
ALTER TABLE "Conversation" ADD COLUMN "productModel" TEXT;
