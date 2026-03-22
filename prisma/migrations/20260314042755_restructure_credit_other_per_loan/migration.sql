/*
  Warnings:

  - You are about to drop the column `long_term_debt` on the `credit_at_agribank` table. All the data in the column will be lost.
  - You are about to drop the column `long_term_purpose` on the `credit_at_agribank` table. All the data in the column will be lost.
  - You are about to drop the column `short_term_debt` on the `credit_at_agribank` table. All the data in the column will be lost.
  - You are about to drop the column `short_term_purpose` on the `credit_at_agribank` table. All the data in the column will be lost.
  - You are about to drop the column `total_debt` on the `credit_at_agribank` table. All the data in the column will be lost.
  - You are about to drop the column `long_term_debt` on the `credit_at_other` table. All the data in the column will be lost.
  - You are about to drop the column `long_term_purpose` on the `credit_at_other` table. All the data in the column will be lost.
  - You are about to drop the column `short_term_debt` on the `credit_at_other` table. All the data in the column will be lost.
  - You are about to drop the column `short_term_purpose` on the `credit_at_other` table. All the data in the column will be lost.
  - You are about to drop the column `total_debt` on the `credit_at_other` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "customers" ADD COLUMN "cccd_old" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_credit_at_agribank" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerId" TEXT NOT NULL,
    "branch_name" TEXT,
    "debt_group" TEXT,
    "loan_term" TEXT,
    "debt_amount" TEXT,
    "loan_purpose" TEXT,
    "repayment_source" TEXT,
    CONSTRAINT "credit_at_agribank_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_credit_at_agribank" ("branch_name", "createdAt", "customerId", "debt_group", "id", "repayment_source", "updatedAt") SELECT "branch_name", "createdAt", "customerId", "debt_group", "id", "repayment_source", "updatedAt" FROM "credit_at_agribank";
DROP TABLE "credit_at_agribank";
ALTER TABLE "new_credit_at_agribank" RENAME TO "credit_at_agribank";
CREATE INDEX "credit_at_agribank_customerId_idx" ON "credit_at_agribank"("customerId");
CREATE TABLE "new_credit_at_other" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerId" TEXT NOT NULL,
    "institution_name" TEXT,
    "debt_group" TEXT,
    "loan_term" TEXT,
    "debt_amount" TEXT,
    "loan_purpose" TEXT,
    "repayment_source" TEXT,
    CONSTRAINT "credit_at_other_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_credit_at_other" ("createdAt", "customerId", "debt_group", "id", "institution_name", "repayment_source", "updatedAt") SELECT "createdAt", "customerId", "debt_group", "id", "institution_name", "repayment_source", "updatedAt" FROM "credit_at_other";
DROP TABLE "credit_at_other";
ALTER TABLE "new_credit_at_other" RENAME TO "credit_at_other";
CREATE INDEX "credit_at_other_customerId_idx" ON "credit_at_other"("customerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
