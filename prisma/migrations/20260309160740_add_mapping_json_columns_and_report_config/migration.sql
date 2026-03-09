-- AlterTable
ALTER TABLE "mapping_instances" ADD COLUMN "aliasJson" TEXT;
ALTER TABLE "mapping_instances" ADD COLUMN "mappingJson" TEXT;

-- CreateTable
CREATE TABLE "report_configs" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "valueJson" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL
);
