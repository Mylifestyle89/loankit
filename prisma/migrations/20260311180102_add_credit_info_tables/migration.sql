-- CreateTable
CREATE TABLE "credit_at_agribank" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerId" TEXT NOT NULL,
    "branch_name" TEXT,
    "debt_group" TEXT,
    "total_debt" TEXT,
    "short_term_debt" TEXT,
    "short_term_purpose" TEXT,
    "long_term_debt" TEXT,
    "long_term_purpose" TEXT,
    "repayment_source" TEXT,
    CONSTRAINT "credit_at_agribank_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "credit_at_other" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerId" TEXT NOT NULL,
    "institution_name" TEXT,
    "debt_group" TEXT,
    "total_debt" TEXT,
    "short_term_debt" TEXT,
    "short_term_purpose" TEXT,
    "long_term_debt" TEXT,
    "long_term_purpose" TEXT,
    "repayment_source" TEXT,
    CONSTRAINT "credit_at_other_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "credit_at_agribank_customerId_idx" ON "credit_at_agribank"("customerId");

-- CreateIndex
CREATE INDEX "credit_at_other_customerId_idx" ON "credit_at_other"("customerId");
