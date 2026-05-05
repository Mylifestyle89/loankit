/**
 * migration-state.ts
 * DB sentinel logic for MigrationState — prevents duplicate migration runs
 * on concurrent cold-starts via serializable transaction + unique key guard.
 */

import { prisma } from "@/lib/prisma";
import { LEGACY_MIGRATION_VERSION } from "./_shared";

// ---------------------------------------------------------------------------
// Module-level in-process cache (avoids repeated DB reads within same process)
// ---------------------------------------------------------------------------

let isMigrationChecked = false;
const MIGRATION_KEY = "LEGACY_MIGRATION";

export function getMigrationChecked(): boolean {
  return isMigrationChecked;
}

export function setMigrationChecked(val: boolean): void {
  isMigrationChecked = val;
}

// ---------------------------------------------------------------------------
// Prisma model detection
// ---------------------------------------------------------------------------

function hasPrismaModel(modelName: string): boolean {
  const model: unknown = Reflect.get(prisma as object, modelName);
  return (
    model !== null &&
    typeof model === "object" &&
    typeof (model as { count?: unknown }).count === "function"
  );
}

export function ensurePrismaModelsExist(): void {
  const { SystemError } = require("@/core/errors/app-error");
  if (
    !hasPrismaModel("masterTemplate") ||
    !hasPrismaModel("mappingInstance")
  ) {
    throw new SystemError(
      "Prisma client thiếu model MasterTemplate/MappingInstance. Chạy: npx prisma generate",
    );
  }
}

// ---------------------------------------------------------------------------
// Sentinel: check + reserve migration slot in a serializable transaction.
// Returns true if this process should run the migration, false if already done.
// ---------------------------------------------------------------------------

export async function acquireMigrationSlot(): Promise<boolean> {
  let shouldRun = false;

  try {
    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.migrationState.findUnique({
          where: { key: MIGRATION_KEY },
        });
        if (existing && existing.version >= LEGACY_MIGRATION_VERSION) {
          return; // Already done
        }

        // Reserve slot — concurrent tx collides on unique constraint → skip
        await tx.migrationState.upsert({
          where: { key: MIGRATION_KEY },
          create: { key: MIGRATION_KEY, version: LEGACY_MIGRATION_VERSION },
          update: { version: LEGACY_MIGRATION_VERSION },
        });

        shouldRun = true;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (err) {
    // Unique constraint violation → another process won the race
    console.warn("[Migration] Concurrent migration detected, skipping:", (err as Error).message);
    setMigrationChecked(true);
    return false;
  }

  return shouldRun;
}
