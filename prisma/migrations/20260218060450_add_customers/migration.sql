-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customer_code" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "address" TEXT,
    "main_business" TEXT,
    "charter_capital" REAL,
    "legal_representative_name" TEXT,
    "legal_representative_title" TEXT,
    "organization_type" TEXT,
    "data_json" TEXT DEFAULT '{}'
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_customer_code_key" ON "customers"("customer_code");
