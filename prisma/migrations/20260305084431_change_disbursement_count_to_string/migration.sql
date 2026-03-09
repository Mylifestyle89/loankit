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
    "disbursementCount" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    CONSTRAINT "loans_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_loans" ("contractNumber", "createdAt", "customerId", "disbursementCount", "endDate", "id", "interestRate", "loanAmount", "purpose", "startDate", "status", "updatedAt") SELECT "contractNumber", "createdAt", "customerId", "disbursementCount", "endDate", "id", "interestRate", "loanAmount", "purpose", "startDate", "status", "updatedAt" FROM "loans";
DROP TABLE "loans";
ALTER TABLE "new_loans" RENAME TO "loans";
CREATE UNIQUE INDEX "loans_contractNumber_key" ON "loans"("contractNumber");
CREATE INDEX "loans_customerId_idx" ON "loans"("customerId");
CREATE INDEX "loans_status_idx" ON "loans"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
