-- Add missing term unit field for disbursement tenor.
ALTER TABLE "disbursements" ADD COLUMN "termUnit" TEXT DEFAULT 'tháng';
