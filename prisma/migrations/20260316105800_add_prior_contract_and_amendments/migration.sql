-- Add prior contract fields to loans
ALTER TABLE "loans" ADD COLUMN "prior_contract_number" TEXT;
ALTER TABLE "loans" ADD COLUMN "prior_contract_date" TEXT;
ALTER TABLE "loans" ADD COLUMN "prior_outstanding" TEXT;

-- Add amendments JSON to collaterals
ALTER TABLE "collaterals" ADD COLUMN "amendments" TEXT;
