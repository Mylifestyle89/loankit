-- Decouple customer mapping instances from generic master templates.
-- Keep historical/customer-specific snapshot so deleting master does not affect existing instances.

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_mapping_instances" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "createdBy" TEXT NOT NULL DEFAULT 'web-user',
  "publishedAt" DATETIME,
  "mappingJsonPath" TEXT NOT NULL,
  "aliasJsonPath" TEXT NOT NULL,
  "masterSnapshotName" TEXT NOT NULL DEFAULT '',
  "fieldCatalogJson" TEXT NOT NULL DEFAULT '[]',
  "masterId" TEXT,
  "customerId" TEXT NOT NULL,
  CONSTRAINT "mapping_instances_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "field_template_masters" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "mapping_instances_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_mapping_instances" (
  "id",
  "createdAt",
  "updatedAt",
  "name",
  "status",
  "createdBy",
  "publishedAt",
  "mappingJsonPath",
  "aliasJsonPath",
  "masterSnapshotName",
  "fieldCatalogJson",
  "masterId",
  "customerId"
)
SELECT
  mi."id",
  mi."createdAt",
  mi."updatedAt",
  mi."name",
  mi."status",
  mi."createdBy",
  mi."publishedAt",
  mi."mappingJsonPath",
  mi."aliasJsonPath",
  COALESCE(ftm."name", ''),
  COALESCE(ftm."fieldCatalogJson", '[]'),
  mi."masterId",
  mi."customerId"
FROM "mapping_instances" mi
LEFT JOIN "field_template_masters" ftm ON ftm."id" = mi."masterId";

DROP TABLE "mapping_instances";
ALTER TABLE "new_mapping_instances" RENAME TO "mapping_instances";

CREATE INDEX "mapping_instances_masterId_idx" ON "mapping_instances"("masterId");
CREATE INDEX "mapping_instances_customerId_idx" ON "mapping_instances"("customerId");
CREATE INDEX "mapping_instances_customerId_masterId_status_idx" ON "mapping_instances"("customerId", "masterId", "status");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
