-- contractNumber is a draft/business field and must allow duplicates.
DROP INDEX IF EXISTS "loans_contractNumber_key";
DROP INDEX IF EXISTS "loans_customerId_contractNumber_key";

-- Keep query performance for contract search/listing.
CREATE INDEX IF NOT EXISTS "loans_contractNumber_idx" ON "loans"("contractNumber");
