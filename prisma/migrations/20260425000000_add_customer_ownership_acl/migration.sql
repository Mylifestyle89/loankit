-- Add createdById (owner) to Customer table
ALTER TABLE "customers" ADD COLUMN "createdById" TEXT REFERENCES "user"("id") ON DELETE SET NULL;
CREATE INDEX "customers_createdById_idx" ON "customers"("createdById");

-- Create CustomerGrant table for admin-delegated access
CREATE TABLE "CustomerGrant" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "customerId"  TEXT NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
    "userId"      TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "grantedById" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("customerId", "userId")
);
CREATE INDEX "CustomerGrant_userId_idx"     ON "CustomerGrant"("userId");
CREATE INDEX "CustomerGrant_customerId_idx" ON "CustomerGrant"("customerId");

-- Backfill: assign all existing customers to the first admin user
UPDATE "customers"
SET "createdById" = (
    SELECT "id" FROM "user" WHERE "role" = 'admin' ORDER BY "createdAt" ASC LIMIT 1
)
WHERE "createdById" IS NULL;
