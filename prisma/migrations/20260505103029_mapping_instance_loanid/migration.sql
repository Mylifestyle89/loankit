-- Phase 3.5: Architecture reconciliation MappingInstance ↔ Loan.
-- Add nullable loanId FK + index. NOT NULL deferred to Phase 5.
-- onDelete: SET NULL — instance là config tái dùng, không cascade.

ALTER TABLE "mapping_instances" ADD COLUMN "loanId" TEXT REFERENCES "loans" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "mapping_instances_loanId_idx" ON "mapping_instances"("loanId");
