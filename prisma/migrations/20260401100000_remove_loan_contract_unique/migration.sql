-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_loans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "loanAmount" REAL NOT NULL,
    "interestRate" REAL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "purpose" TEXT,
    "loan_method" TEXT NOT NULL DEFAULT 'tung_lan',
    "disbursementCount" TEXT,
    "collateralValue" REAL,
    "securedObligation" REAL,
    "disbursementLimitByAsset" REAL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lending_method" TEXT,
    "tcmblm_reason" TEXT,
    "interest_method" TEXT,
    "principal_schedule" TEXT,
    "interest_schedule" TEXT,
    "policy_program" TEXT,
    "total_capital_need" REAL,
    "equity_amount" REAL,
    "cash_equity" REAL,
    "labor_equity" REAL,
    "other_loan" REAL,
    "other_asset_equity" REAL,
    "expected_revenue" REAL,
    "expected_cost" REAL,
    "expected_profit" REAL,
    "from_project" TEXT,
    "other_income" TEXT,
    "other_income_detail" TEXT,
    "customer_rating" TEXT,
    "debt_group" TEXT,
    "scoring_period" TEXT,
    "prior_contract_number" TEXT,
    "prior_contract_date" TEXT,
    "prior_outstanding" REAL,
    "selectedCollateralIds" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "loans_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_loans" ("id", "createdAt", "updatedAt", "customerId", "contractNumber", "loanAmount", "interestRate", "startDate", "endDate", "purpose", "loan_method", "disbursementCount", "collateralValue", "securedObligation", "disbursementLimitByAsset", "status", "lending_method", "tcmblm_reason", "interest_method", "principal_schedule", "interest_schedule", "policy_program", "total_capital_need", "equity_amount", "cash_equity", "labor_equity", "other_loan", "other_asset_equity", "expected_revenue", "expected_cost", "expected_profit", "from_project", "other_income", "other_income_detail", "customer_rating", "debt_group", "scoring_period", "prior_contract_number", "prior_contract_date", "prior_outstanding", "selectedCollateralIds")
SELECT "id", "createdAt", "updatedAt", "customerId", "contractNumber", "loanAmount", "interestRate", "startDate", "endDate", "purpose", "loan_method", "disbursementCount", "collateralValue", "securedObligation", "disbursementLimitByAsset", "status", "lending_method", "tcmblm_reason", "interest_method", "principal_schedule", "interest_schedule", "policy_program", "total_capital_need", "equity_amount", "cash_equity", "labor_equity", "other_loan", "other_asset_equity", "expected_revenue", "expected_cost", "expected_profit", "from_project", "other_income", "other_income_detail", "customer_rating", "debt_group", "scoring_period", "prior_contract_number", "prior_contract_date", "prior_outstanding", COALESCE("selectedCollateralIds", '[]') FROM "loans";

DROP TABLE "loans";
ALTER TABLE "new_loans" RENAME TO "loans";

CREATE UNIQUE INDEX "loans_customerId_contractNumber_key" ON "loans"("customerId", "contractNumber");
CREATE INDEX "loans_customerId_idx" ON "loans"("customerId");
CREATE INDEX "loans_status_idx" ON "loans"("status");
CREATE INDEX "loans_loan_method_idx" ON "loans"("loan_method");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
