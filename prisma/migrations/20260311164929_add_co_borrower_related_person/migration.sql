-- CreateTable
CREATE TABLE "co_borrowers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT,
    "full_name" TEXT NOT NULL,
    "id_type" TEXT,
    "id_number" TEXT,
    "id_issued_date" TEXT,
    "id_old" TEXT,
    "id_issued_place" TEXT,
    "birth_year" TEXT,
    "phone" TEXT,
    "current_address" TEXT,
    "permanent_address" TEXT,
    "relationship" TEXT,
    "agribank_debt" TEXT,
    "agribank_branch" TEXT,
    CONSTRAINT "co_borrowers_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "related_persons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "id_number" TEXT,
    "address" TEXT,
    "relation_type" TEXT,
    "agribank_debt" TEXT,
    "agribank_branch" TEXT,
    CONSTRAINT "related_persons_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "co_borrowers_customerId_idx" ON "co_borrowers"("customerId");

-- CreateIndex
CREATE INDEX "related_persons_customerId_idx" ON "related_persons"("customerId");
