-- Add JSON array column for PA documents on customers.
ALTER TABLE "customers" ADD COLUMN "documents_pa_json" TEXT DEFAULT '[]';
