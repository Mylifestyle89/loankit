-- Finalize loan contract policy: allow duplicate contract numbers during draft stage.
DROP INDEX IF EXISTS "loans_customerId_contractNumber_key";

-- Keep lookup performance per customer + contract number without uniqueness.
CREATE INDEX IF NOT EXISTS "loans_customerId_contractNumber_idx" ON "loans"("customerId", "contractNumber");
