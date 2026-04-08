-- Phase 2 PII migration: step 1 of 2.
-- Adds the customer_code_hash column (nullable so the backfill script can
-- populate it for existing rows) and drops the unique index on
-- customer_code itself. The unique constraint on customer_code_hash is
-- added in a second migration once every row has a valid hash.

-- 1. Drop the (now-meaningless) unique index on customer_code. It still
--    exists in Turso production from the original @unique directive, and
--    leaving it in place blocks new inserts that re-encrypt a CIF to a
--    different ciphertext.
DROP INDEX IF EXISTS "customers_customer_code_key";

-- 2. Add the nullable customer_code_hash column. Nullable is intentional
--    — the backfill script (scripts/migrate-pii-backfill.ts) fills every
--    row, and the follow-up migration enforces NOT NULL + UNIQUE.
ALTER TABLE "customers" ADD COLUMN "customer_code_hash" TEXT;
