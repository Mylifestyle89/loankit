-- Add missing indexes for Branch and Verification models

-- Branch: index on name for search/lookup
CREATE INDEX IF NOT EXISTS "branches_name_idx" ON "branches"("name");

-- Branch: index on branch_code for lookup by code
CREATE INDEX IF NOT EXISTS "branches_branch_code_idx" ON "branches"("branch_code");

-- Verification: index on identifier for auth lookups (better-auth queries by identifier)
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification"("identifier");

-- Verification: index on expiresAt for expired-token cleanup queries
CREATE INDEX IF NOT EXISTS "verification_expiresAt_idx" ON "verification"("expiresAt");
