-- Align beneficiary-related tables with current Prisma schema.
ALTER TABLE "beneficiaries" ADD COLUMN "address" TEXT;
ALTER TABLE "disbursement_beneficiaries" ADD COLUMN "updatedAt" DATETIME;
UPDATE "disbursement_beneficiaries"
SET "updatedAt" = COALESCE("updatedAt", "createdAt");
ALTER TABLE "disbursement_beneficiaries" ADD COLUMN "address" TEXT;
