-- AlterTable
ALTER TABLE "app_notifications" ADD COLUMN "emailError" TEXT;
ALTER TABLE "app_notifications" ADD COLUMN "emailSentAt" DATETIME;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN "email" TEXT;
