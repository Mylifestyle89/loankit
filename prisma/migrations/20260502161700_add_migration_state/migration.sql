-- CreateTable: MigrationState — DB sentinel to prevent duplicate cold-start migrations
CREATE TABLE "migration_states" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
