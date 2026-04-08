/**
 * Emergency rollback for the phase 2 PII migration.
 *
 * Reverses what scripts/migrate-pii-backfill.ts did on a live database:
 *   1. Decrypts every encrypted customer_code / phone / cccd / ... back
 *      to plaintext on Customer, CoBorrower, RelatedPerson rows.
 *   2. Drops the customers_customer_code_hash_key unique index.
 *   3. Nulls out customer_code_hash for every customer.
 *
 * After running this the database is in the same shape as the step-1
 * migration (the nullable customer_code_hash column still exists, but
 * every value is null and the unique index is gone), so the original
 * application code can talk to it again.
 *
 * For a truly hard reset, restore from the JSON backup produced by
 * scripts/backup-turso-to-json.ts — that is always the safer option.
 *
 * Run:
 *   npx tsx scripts/migrate-pii-rollback.ts          # local dev.db
 *   npx tsx scripts/migrate-pii-rollback.ts --turso  # production Turso
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { resolve } from "node:path";
import { decryptField, isEncrypted } from "@/lib/field-encryption";
import { ensureEncryptionKey, loadProdEnv } from "./_env-utils";

const CUSTOMER_FIELDS = [
  "customer_code",
  "phone",
  "cccd",
  "spouse_cccd",
  "cccd_old",
  "bank_account",
  "spouse_name",
  "email",
] as const;

const COBORROWER_FIELDS = [
  "full_name",
  "id_number",
  "id_old",
  "phone",
  "current_address",
  "permanent_address",
] as const;

const RELATED_PERSON_FIELDS = ["id_number", "address"] as const;

function createPrisma(mode: "local" | "turso"): PrismaClient {
  if (mode === "turso") {
    const env = loadProdEnv();
    const url = env.TURSO_DATABASE_URL || env.DATABASE_URL;
    const authToken = env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) throw new Error("Turso env vars missing");
    return new PrismaClient({ adapter: new PrismaLibSql({ url, authToken }) });
  }
  const dbPath = resolve(process.cwd(), "prisma/dev.db");
  return new PrismaClient({ adapter: new PrismaLibSql({ url: `file:${dbPath}` }) });
}

function decryptRecord(row: Record<string, unknown>, fields: readonly string[]) {
  const patch: Record<string, unknown> = {};
  for (const field of fields) {
    const val = row[field];
    if (typeof val === "string" && isEncrypted(val)) {
      try {
        patch[field] = decryptField(val);
      } catch (err) {
        console.error(`  decrypt ${field} on ${row.id}:`, err instanceof Error ? err.message : err);
      }
    }
  }
  return patch;
}

async function main() {
  const mode: "local" | "turso" = process.argv.includes("--turso") ? "turso" : "local";
  console.log(`Rollback mode: ${mode}`);
  ensureEncryptionKey();

  const prisma = createPrisma(mode);
  try {
    // 1. Drop the unique index (best-effort; ignore if missing).
    try {
      await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "customers_customer_code_hash_key"`);
      console.log("Dropped index customers_customer_code_hash_key");
    } catch (err) {
      console.warn("Drop index warning:", err instanceof Error ? err.message : err);
    }

    // 2. Decrypt Customer rows. Prisma's TS types require customer_code_hash
    //    to be non-null, so we clear the column via raw SQL in one shot.
    const customers = await prisma.customer.findMany();
    let custUpdated = 0;
    for (const row of customers) {
      const plain = decryptRecord(row as unknown as Record<string, unknown>, CUSTOMER_FIELDS);
      if (Object.keys(plain).length > 0) {
        await prisma.customer.update({ where: { id: row.id }, data: plain as never });
      }
      custUpdated++;
    }
    await prisma.$executeRawUnsafe(`UPDATE "customers" SET "customer_code_hash" = NULL`);
    console.log(`Customers: ${custUpdated} rows decrypted + hash cleared`);

    // 3. Decrypt CoBorrower rows.
    const coBorrowers = await prisma.coBorrower.findMany();
    let cbUpdated = 0;
    for (const row of coBorrowers) {
      const plain = decryptRecord(row as unknown as Record<string, unknown>, COBORROWER_FIELDS);
      if (Object.keys(plain).length > 0) {
        await prisma.coBorrower.update({ where: { id: row.id }, data: plain as never });
        cbUpdated++;
      }
    }
    console.log(`CoBorrowers: ${cbUpdated} rows decrypted`);

    // 4. Decrypt RelatedPerson rows.
    const relatedPersons = await prisma.relatedPerson.findMany();
    let rpUpdated = 0;
    for (const row of relatedPersons) {
      const plain = decryptRecord(row as unknown as Record<string, unknown>, RELATED_PERSON_FIELDS);
      if (Object.keys(plain).length > 0) {
        await prisma.relatedPerson.update({ where: { id: row.id }, data: plain as never });
        rpUpdated++;
      }
    }
    console.log(`RelatedPersons: ${rpUpdated} rows decrypted`);

    console.log("\nRollback complete. Application code changes are NOT reverted — git revert commits separately.");
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((err) => {
  console.error("Rollback failed:", err);
  process.exit(1);
});
