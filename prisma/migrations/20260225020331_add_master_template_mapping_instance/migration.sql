-- CreateTable
CREATE TABLE "field_template_masters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "fieldCatalogJson" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "mapping_instances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdBy" TEXT NOT NULL DEFAULT 'web-user',
    "publishedAt" DATETIME,
    "mappingJsonPath" TEXT NOT NULL,
    "aliasJsonPath" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    CONSTRAINT "mapping_instances_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "field_template_masters" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mapping_instances_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "field_template_masters_status_idx" ON "field_template_masters"("status");

-- CreateIndex
CREATE INDEX "mapping_instances_masterId_idx" ON "mapping_instances"("masterId");

-- CreateIndex
CREATE INDEX "mapping_instances_customerId_idx" ON "mapping_instances"("customerId");

-- CreateIndex
CREATE INDEX "mapping_instances_customerId_masterId_status_idx" ON "mapping_instances"("customerId", "masterId", "status");
