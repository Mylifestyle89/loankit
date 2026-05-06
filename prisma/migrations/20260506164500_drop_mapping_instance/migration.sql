-- Phase 6i: Drop MappingInstance table
-- Prerequisites:
--   1. All code references to mapping_instances have been removed (Phase 6g + 6h)
--   2. Prisma schema no longer has MappingInstance model
-- Deploy sequence (Turso prod):
--   a. Run this SQL FIRST on Turso: turso db shell <db-name> < migration.sql
--   b. Deploy new code after SQL succeeds

-- Drop indexes first (SQLite requires this before DROP TABLE)
DROP INDEX IF EXISTS "mapping_instances_loanId_idx";
DROP INDEX IF EXISTS "mapping_instances_masterId_idx";
DROP INDEX IF EXISTS "mapping_instances_customerId_idx";
DROP INDEX IF EXISTS "mapping_instances_customerId_masterId_status_idx";

-- Drop the table
DROP TABLE IF EXISTS "mapping_instances";
