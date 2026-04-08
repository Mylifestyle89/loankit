-- Phase 2 PII migration: step 2 of 2.
-- Runs after scripts/migrate-pii-backfill.ts has populated every row's
-- customer_code_hash. Enforces uniqueness at the database level.
--
-- Note: we intentionally keep the column nullable at the SQLite storage
-- level even though the Prisma schema declares it NOT NULL. Enforcing
-- NOT NULL requires a full table rebuild in SQLite, which risks
-- disturbing orphan columns that Prisma's schema does not know about
-- (e.g. disbursement_beneficiaries.updatedAt). The application layer
-- already guarantees customer_code_hash is always populated via
-- customer-service-helpers + customer-draft.service + the backfill run.

CREATE UNIQUE INDEX "customers_customer_code_hash_key"
  ON "customers"("customer_code_hash");
