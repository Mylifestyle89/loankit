-- Add retail invoice fields to Invoice table
ALTER TABLE "invoices" ADD COLUMN "items_json" TEXT;
ALTER TABLE "invoices" ADD COLUMN "templateType" TEXT;
