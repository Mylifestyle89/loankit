-- CreateTable
CREATE TABLE "loans" (
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
    "status" TEXT NOT NULL DEFAULT 'active',
    CONSTRAINT "loans_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "disbursements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "loanId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "disbursementDate" DATETIME NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    CONSTRAINT "disbursements_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "disbursementId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "issueDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "customDeadline" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    CONSTRAINT "invoices_disbursementId_fkey" FOREIGN KEY ("disbursementId") REFERENCES "disbursements" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "app_notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT DEFAULT '{}'
);

-- CreateIndex
CREATE UNIQUE INDEX "loans_contractNumber_key" ON "loans"("contractNumber");

-- CreateIndex
CREATE INDEX "loans_customerId_idx" ON "loans"("customerId");

-- CreateIndex
CREATE INDEX "loans_status_idx" ON "loans"("status");

-- CreateIndex
CREATE INDEX "disbursements_loanId_idx" ON "disbursements"("loanId");

-- CreateIndex
CREATE INDEX "disbursements_status_idx" ON "disbursements"("status");

-- CreateIndex
CREATE INDEX "invoices_disbursementId_idx" ON "invoices"("disbursementId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_dueDate_idx" ON "invoices"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_supplierName_key" ON "invoices"("invoiceNumber", "supplierName");

-- CreateIndex
CREATE INDEX "app_notifications_readAt_idx" ON "app_notifications"("readAt");

-- CreateIndex
CREATE INDEX "app_notifications_type_idx" ON "app_notifications"("type");
