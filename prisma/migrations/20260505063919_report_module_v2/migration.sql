-- Phase 1 v2: Report module schema migration
-- Non-breaking: ADD COLUMN with defaults, ADD TABLE, ADD INDEX. No DROP/RENAME.
-- Compatible with SQLite local + libSQL Turso.

-- ─── field_template_masters: companyType + reportKind + placeholderSchemaJson ───
ALTER TABLE "field_template_masters" ADD COLUMN "companyType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "field_template_masters" ADD COLUMN "reportKind" TEXT NOT NULL DEFAULT '';
ALTER TABLE "field_template_masters" ADD COLUMN "placeholderSchemaJson" TEXT NOT NULL DEFAULT '[]';
CREATE INDEX "field_template_masters_companyType_reportKind_idx" ON "field_template_masters"("companyType", "reportKind");

-- ─── customers: customerProfileValuesJson (shared values across all loans) ───
ALTER TABLE "customers" ADD COLUMN "customerProfileValuesJson" TEXT NOT NULL DEFAULT '{}';

-- ─── loans: masterTemplateId (FK) + dossierValuesJson + exportedDocxBlobRef ───
ALTER TABLE "loans" ADD COLUMN "masterTemplateId" TEXT;
ALTER TABLE "loans" ADD COLUMN "dossierValuesJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "loans" ADD COLUMN "exportedDocxBlobRef" TEXT;
CREATE INDEX "loans_masterTemplateId_idx" ON "loans"("masterTemplateId");
-- FK constraint: SQLite doesn't enforce post-hoc FKs, libSQL same. Application enforces.

-- ─── loan_report_exports: audit trail per export (rotate-5 logic in Phase 3) ───
CREATE TABLE "loan_report_exports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loanId" TEXT NOT NULL,
    "exportedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exportedBy" TEXT NOT NULL,
    "docxPath" TEXT,
    "valuesSnapshot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    CONSTRAINT "loan_report_exports_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "loan_report_exports_loanId_exportedAt_idx" ON "loan_report_exports"("loanId", "exportedAt");
CREATE INDEX "loan_report_exports_status_idx" ON "loan_report_exports"("status");
