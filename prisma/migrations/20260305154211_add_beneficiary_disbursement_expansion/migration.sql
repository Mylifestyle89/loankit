-- AlterTable
ALTER TABLE "disbursements" ADD COLUMN "currentOutstanding" REAL;
ALTER TABLE "disbursements" ADD COLUMN "debtAmount" REAL;
ALTER TABLE "disbursements" ADD COLUMN "interestSchedule" TEXT;
ALTER TABLE "disbursements" ADD COLUMN "loanTerm" INTEGER;
ALTER TABLE "disbursements" ADD COLUMN "principalSchedule" TEXT;
ALTER TABLE "disbursements" ADD COLUMN "purpose" TEXT;
ALTER TABLE "disbursements" ADD COLUMN "repaymentEndDate" DATETIME;
ALTER TABLE "disbursements" ADD COLUMN "supportingDoc" TEXT;
ALTER TABLE "disbursements" ADD COLUMN "totalOutstanding" REAL;

-- CreateTable
CREATE TABLE "beneficiaries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "loanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountNumber" TEXT,
    "bankName" TEXT,
    CONSTRAINT "beneficiaries_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "disbursement_beneficiaries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disbursementId" TEXT NOT NULL,
    "beneficiaryId" TEXT,
    "beneficiaryName" TEXT NOT NULL,
    "accountNumber" TEXT,
    "bankName" TEXT,
    "amount" REAL NOT NULL,
    "invoiceStatus" TEXT NOT NULL DEFAULT 'pending',
    "invoiceAmount" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "disbursement_beneficiaries_disbursementId_fkey" FOREIGN KEY ("disbursementId") REFERENCES "disbursements" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "disbursement_beneficiaries_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "beneficiaries" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "disbursementId" TEXT NOT NULL,
    "disbursementBeneficiaryId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "issueDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "customDeadline" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    CONSTRAINT "invoices_disbursementId_fkey" FOREIGN KEY ("disbursementId") REFERENCES "disbursements" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "invoices_disbursementBeneficiaryId_fkey" FOREIGN KEY ("disbursementBeneficiaryId") REFERENCES "disbursement_beneficiaries" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_invoices" ("amount", "createdAt", "customDeadline", "disbursementId", "dueDate", "id", "invoiceNumber", "issueDate", "notes", "status", "supplierName", "updatedAt") SELECT "amount", "createdAt", "customDeadline", "disbursementId", "dueDate", "id", "invoiceNumber", "issueDate", "notes", "status", "supplierName", "updatedAt" FROM "invoices";
DROP TABLE "invoices";
ALTER TABLE "new_invoices" RENAME TO "invoices";
CREATE INDEX "invoices_disbursementId_idx" ON "invoices"("disbursementId");
CREATE INDEX "invoices_disbursementBeneficiaryId_idx" ON "invoices"("disbursementBeneficiaryId");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_dueDate_idx" ON "invoices"("dueDate");
CREATE UNIQUE INDEX "invoices_invoiceNumber_supplierName_key" ON "invoices"("invoiceNumber", "supplierName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "beneficiaries_loanId_idx" ON "beneficiaries"("loanId");

-- CreateIndex
CREATE INDEX "disbursement_beneficiaries_disbursementId_idx" ON "disbursement_beneficiaries"("disbursementId");

-- CreateIndex
CREATE INDEX "disbursement_beneficiaries_beneficiaryId_idx" ON "disbursement_beneficiaries"("beneficiaryId");
