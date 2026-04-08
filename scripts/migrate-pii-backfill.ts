/**
 * Phase 2 PII backfill — re-encrypt every Customer/CoBorrower/RelatedPerson
 * row so the extended PII fields are encrypted and every Customer row has
 * a deterministic customer_code_hash for lookups.
 *
 * Idempotent: can be re-run safely. Rows whose target fields are already
 * encrypted are skipped; customer_code is always fully re-derived so the
 * hash column is populated even when step 1 migration has already created
 * the column but not yet filled it.
 *
 * Safe modes:
 *   npx tsx scripts/migrate-pii-backfill.ts          # local dev.db only
 *   npx tsx scripts/migrate-pii-backfill.ts --turso  # production Turso
 *
 * Always take a backup (scripts/backup-turso-to-json.ts) first.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  decryptField,
  encryptCoBorrowerPii,
  encryptCustomerPii,
  encryptRelatedPersonPii,
  hashCustomerCode,
  isEncrypted,
} from "@/lib/field-encryption";

// ---------- env loading (mirrors backup-turso-to-json) ----------
function loadEnvFile(filePath: string): Record<string, string> {
  const raw = readFileSync(filePath, "utf8");
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[key] = value;
  }
  return env;
}

function createPrisma(mode: "local" | "turso"): PrismaClient {
  if (mode === "turso") {
    const env = loadEnvFile(resolve(process.cwd(), ".env.vercel.production"));
    const url = env.TURSO_DATABASE_URL || env.DATABASE_URL;
    const authToken = env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) throw new Error("Turso env vars missing");
    // ENCRYPTION_KEY must match what the live app uses.
    if (!process.env.ENCRYPTION_KEY && env.ENCRYPTION_KEY) {
      process.env.ENCRYPTION_KEY = env.ENCRYPTION_KEY;
    }
    const adapter = new PrismaLibSql({ url, authToken });
    return new PrismaClient({ adapter });
  }
  const dbPath = resolve(process.cwd(), "prisma/dev.db");
  const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
  return new PrismaClient({ adapter });
}

// ---------- per-model backfill ----------
type Counters = { scanned: number; updated: number; skipped: number; errors: number };
function emptyCounters(): Counters {
  return { scanned: 0, updated: 0, skipped: 0, errors: 0 };
}

async function backfillCustomers(prisma: PrismaClient): Promise<Counters> {
  const counters = emptyCounters();
  const batchSize = 100;
  let cursorId: string | undefined;

  while (true) {
    const rows = await prisma.customer.findMany({
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
    });
    if (rows.length === 0) break;

    for (const row of rows) {
      counters.scanned++;
      try {
        // Pull plaintext CIF regardless of stored state (encrypted or not).
        const plainCif =
          typeof row.customer_code === "string" && isEncrypted(row.customer_code)
            ? decryptField(row.customer_code)
            : (row.customer_code as string);

        // Build an update payload: encrypt every PII field + always refresh
        // the hash. encryptCustomerPii is idempotent on already-encrypted
        // strings, so re-running the script is safe.
        const encrypted = encryptCustomerPii({
          customer_code: plainCif, // force a fresh ciphertext so the stored IV matches hash source
          phone: row.phone,
          cccd: row.cccd,
          spouse_cccd: row.spouse_cccd,
          cccd_old: row.cccd_old,
          bank_account: row.bank_account,
          spouse_name: row.spouse_name,
          email: row.email,
        });
        await prisma.customer.update({
          where: { id: row.id },
          data: {
            ...encrypted,
            customer_code_hash: hashCustomerCode(plainCif),
          },
        });
        counters.updated++;
      } catch (err) {
        counters.errors++;
        console.error(`  customer ${row.id}:`, err instanceof Error ? err.message : err);
      }
    }
    cursorId = rows[rows.length - 1].id;
  }
  return counters;
}

async function backfillCoBorrowers(prisma: PrismaClient): Promise<Counters> {
  const counters = emptyCounters();
  const rows = await prisma.coBorrower.findMany();
  counters.scanned = rows.length;
  for (const row of rows) {
    try {
      const before = row as unknown as Record<string, unknown>;
      const encrypted = encryptCoBorrowerPii(before);
      // Detect whether anything actually changed to avoid pointless writes.
      const dirty = Object.keys(encrypted).some((k) => encrypted[k] !== before[k]);
      if (!dirty) {
        counters.skipped++;
        continue;
      }
      await prisma.coBorrower.update({ where: { id: row.id }, data: encrypted as never });
      counters.updated++;
    } catch (err) {
      counters.errors++;
      console.error(`  co_borrower ${row.id}:`, err instanceof Error ? err.message : err);
    }
  }
  return counters;
}

async function backfillRelatedPersons(prisma: PrismaClient): Promise<Counters> {
  const counters = emptyCounters();
  const rows = await prisma.relatedPerson.findMany();
  counters.scanned = rows.length;
  for (const row of rows) {
    try {
      const before = row as unknown as Record<string, unknown>;
      const encrypted = encryptRelatedPersonPii(before);
      const dirty = Object.keys(encrypted).some((k) => encrypted[k] !== before[k]);
      if (!dirty) {
        counters.skipped++;
        continue;
      }
      await prisma.relatedPerson.update({ where: { id: row.id }, data: encrypted as never });
      counters.updated++;
    } catch (err) {
      counters.errors++;
      console.error(`  related_person ${row.id}:`, err instanceof Error ? err.message : err);
    }
  }
  return counters;
}

// ---------- main ----------
async function main() {
  const mode: "local" | "turso" = process.argv.includes("--turso") ? "turso" : "local";
  console.log(`Backfill mode: ${mode}`);
  if (!process.env.ENCRYPTION_KEY && mode === "local") {
    const env = loadEnvFile(resolve(process.cwd(), ".env"));
    if (env.ENCRYPTION_KEY) process.env.ENCRYPTION_KEY = env.ENCRYPTION_KEY;
  }

  const prisma = createPrisma(mode);
  try {
    console.log("\nCustomers...");
    const cust = await backfillCustomers(prisma);
    console.log(`  scanned ${cust.scanned}  updated ${cust.updated}  errors ${cust.errors}`);

    console.log("\nCoBorrowers...");
    const cb = await backfillCoBorrowers(prisma);
    console.log(`  scanned ${cb.scanned}  updated ${cb.updated}  skipped ${cb.skipped}  errors ${cb.errors}`);

    console.log("\nRelatedPersons...");
    const rp = await backfillRelatedPersons(prisma);
    console.log(`  scanned ${rp.scanned}  updated ${rp.updated}  skipped ${rp.skipped}  errors ${rp.errors}`);

    const totalErrors = cust.errors + cb.errors + rp.errors;
    if (totalErrors > 0) {
      console.error(`\nBackfill finished with ${totalErrors} errors — review the log above.`);
      process.exit(1);
    }
    console.log("\nBackfill complete.");
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
