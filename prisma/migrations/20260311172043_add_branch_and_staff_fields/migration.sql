-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "name_uppercase" TEXT,
    "address" TEXT,
    "branch_code" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "tax_code" TEXT,
    "tax_issued_date" TEXT,
    "tax_issued_place" TEXT,
    "district" TEXT,
    "province" TEXT
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
    "cccd_issued_date" TEXT,
    "cccd_issued_place" TEXT,
    "date_of_birth" TEXT,
    "gender" TEXT,
    "phone" TEXT,
    "marital_status" TEXT,
    "spouse_name" TEXT,
    "spouse_cccd" TEXT,
    "bank_account" TEXT,
    "bank_name" TEXT,
    "email" TEXT,
    "active_branch_id" TEXT,
    "relationship_officer" TEXT,
    "appraiser" TEXT,
    "approver_name" TEXT,
    "approver_title" TEXT,
    "data_json" TEXT DEFAULT '{}',
    CONSTRAINT "customers_active_branch_id_fkey" FOREIGN KEY ("active_branch_id") REFERENCES "branches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_customers" ("address", "bank_account", "bank_name", "cccd", "cccd_issued_date", "cccd_issued_place", "charter_capital", "createdAt", "customer_code", "customer_name", "customer_type", "data_json", "date_of_birth", "email", "gender", "id", "legal_representative_name", "legal_representative_title", "main_business", "marital_status", "organization_type", "phone", "spouse_cccd", "spouse_name", "updatedAt") SELECT "address", "bank_account", "bank_name", "cccd", "cccd_issued_date", "cccd_issued_place", "charter_capital", "createdAt", "customer_code", "customer_name", "customer_type", "data_json", "date_of_birth", "email", "gender", "id", "legal_representative_name", "legal_representative_title", "main_business", "marital_status", "organization_type", "phone", "spouse_cccd", "spouse_name", "updatedAt" FROM "customers";
DROP TABLE "customers";
ALTER TABLE "new_customers" RENAME TO "customers";
CREATE UNIQUE INDEX "customers_customer_code_key" ON "customers"("customer_code");
CREATE INDEX "customers_customer_type_idx" ON "customers"("customer_type");
CREATE INDEX "customers_active_branch_id_idx" ON "customers"("active_branch_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
