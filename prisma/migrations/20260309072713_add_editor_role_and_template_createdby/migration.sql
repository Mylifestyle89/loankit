-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_field_template_masters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "fieldCatalogJson" TEXT NOT NULL DEFAULT '[]',
    "createdBy" TEXT NOT NULL DEFAULT 'system'
);
INSERT INTO "new_field_template_masters" ("createdAt", "description", "fieldCatalogJson", "id", "name", "status", "updatedAt") SELECT "createdAt", "description", "fieldCatalogJson", "id", "name", "status", "updatedAt" FROM "field_template_masters";
DROP TABLE "field_template_masters";
ALTER TABLE "new_field_template_masters" RENAME TO "field_template_masters";
CREATE INDEX "field_template_masters_status_idx" ON "field_template_masters"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
