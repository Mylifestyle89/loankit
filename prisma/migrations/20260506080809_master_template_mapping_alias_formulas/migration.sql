-- Phase 6a: master-centric mapping/alias/formulas config.
-- Add 3 nullable-default JSON columns to field_template_masters.
-- Backfill happens via scripts/migrate-mapping-config.ts.

ALTER TABLE "field_template_masters" ADD COLUMN "defaultMappingJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "field_template_masters" ADD COLUMN "defaultAliasJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "field_template_masters" ADD COLUMN "formulasJson" TEXT NOT NULL DEFAULT '{}';
