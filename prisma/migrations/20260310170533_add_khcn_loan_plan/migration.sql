-- CreateTable
CREATE TABLE "loan_plan_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "cost_items_template_json" TEXT NOT NULL DEFAULT '[]',
    "revenue_template_json" TEXT NOT NULL DEFAULT '[]',
    "defaults_json" TEXT NOT NULL DEFAULT '{}'
);

-- CreateTable
CREATE TABLE "loan_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerId" TEXT NOT NULL,
    "templateId" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "loan_method" TEXT NOT NULL DEFAULT 'tung_lan',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "cost_items_json" TEXT NOT NULL DEFAULT '[]',
    "revenue_items_json" TEXT NOT NULL DEFAULT '[]',
    "financials_json" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "loan_plans_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "loan_plans_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "loan_plan_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customer_code" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_type" TEXT NOT NULL DEFAULT 'corporate',
    "address" TEXT,
    "main_business" TEXT,
    "charter_capital" REAL,
    "legal_representative_name" TEXT,
    "legal_representative_title" TEXT,
    "organization_type" TEXT,
    "cccd" TEXT,
    "date_of_birth" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "data_json" TEXT DEFAULT '{}'
);
INSERT INTO "new_customers" ("address", "charter_capital", "createdAt", "customer_code", "customer_name", "data_json", "email", "id", "legal_representative_name", "legal_representative_title", "main_business", "organization_type", "updatedAt") SELECT "address", "charter_capital", "createdAt", "customer_code", "customer_name", "data_json", "email", "id", "legal_representative_name", "legal_representative_title", "main_business", "organization_type", "updatedAt" FROM "customers";
DROP TABLE "customers";
ALTER TABLE "new_customers" RENAME TO "customers";
CREATE UNIQUE INDEX "customers_customer_code_key" ON "customers"("customer_code");
CREATE INDEX "customers_customer_type_idx" ON "customers"("customer_type");
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
    CONSTRAINT "loans_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_loans" ("collateralValue", "contractNumber", "createdAt", "customerId", "disbursementCount", "disbursementLimitByAsset", "endDate", "id", "interestRate", "loanAmount", "purpose", "securedObligation", "startDate", "status", "updatedAt") SELECT "collateralValue", "contractNumber", "createdAt", "customerId", "disbursementCount", "disbursementLimitByAsset", "endDate", "id", "interestRate", "loanAmount", "purpose", "securedObligation", "startDate", "status", "updatedAt" FROM "loans";
DROP TABLE "loans";
ALTER TABLE "new_loans" RENAME TO "loans";
CREATE UNIQUE INDEX "loans_contractNumber_key" ON "loans"("contractNumber");
CREATE INDEX "loans_customerId_idx" ON "loans"("customerId");
CREATE INDEX "loans_status_idx" ON "loans"("status");
CREATE INDEX "loans_loan_method_idx" ON "loans"("loan_method");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "loan_plan_templates_category_idx" ON "loan_plan_templates"("category");

-- CreateIndex
CREATE INDEX "loan_plans_customerId_idx" ON "loan_plans"("customerId");

-- CreateIndex
CREATE INDEX "loan_plans_status_idx" ON "loan_plans"("status");
