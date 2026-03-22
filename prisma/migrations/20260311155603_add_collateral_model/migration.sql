-- CreateTable
CREATE TABLE "collaterals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerId" TEXT NOT NULL,
    "collateral_type" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "total_value" REAL,
    "obligation" REAL,
    "properties_json" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "collaterals_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "collaterals_customerId_idx" ON "collaterals"("customerId");

-- CreateIndex
CREATE INDEX "collaterals_collateral_type_idx" ON "collaterals"("collateral_type");
