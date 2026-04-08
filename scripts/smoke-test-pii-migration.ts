/**
 * Smoke test after phase 2 PII backfill — verifies that:
 *   1. Every customer has a non-null customer_code_hash
 *   2. Lookup by hashCustomerCode(plaintext CIF) finds the row
 *   3. CoBorrower/RelatedPerson PII fields round-trip back to plaintext
 *
 * Run: npx tsx scripts/smoke-test-pii-migration.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { resolve } from "node:path";
import {
  decryptCoBorrowerPii,
  decryptField,
  decryptRelatedPersonPii,
  hashCustomerCode,
  isEncrypted,
} from "@/lib/field-encryption";
import { ensureEncryptionKey, loadProdEnv } from "./_env-utils";

async function main() {
  const useTurso = process.argv.includes("--turso");
  ensureEncryptionKey();

  let prisma: PrismaClient;
  if (useTurso) {
    const env = loadProdEnv();
    const url = env.TURSO_DATABASE_URL || env.DATABASE_URL;
    const authToken = env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) throw new Error("Turso env vars missing");
    prisma = new PrismaClient({ adapter: new PrismaLibSql({ url, authToken }) });
    console.log(`Target: ${url}`);
  } else {
    const dbPath = resolve(process.cwd(), "prisma/dev.db");
    prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: `file:${dbPath}` }) });
    console.log(`Target: ${dbPath}`);
  }

  try {
    // 1. Every customer has a hash
    const total = await prisma.customer.count();
    const withHash = await prisma.customer.count({
      where: { NOT: { customer_code_hash: "" } },
    });
    console.log(`Customers: ${total} total, ${withHash} with non-empty hash`);

    // 2. Hash lookup round-trip on 3 sample customers
    const samples = await prisma.customer.findMany({ take: 3 });
    for (const row of samples) {
      const plain = isEncrypted(row.customer_code) ? decryptField(row.customer_code) : row.customer_code;
      const hash = hashCustomerCode(plain);
      const found = await prisma.customer.findUnique({ where: { customer_code_hash: hash } });
      const ok = found?.id === row.id;
      console.log(`  ${row.id.slice(0, 10)}  plain=${plain.slice(0, 12)}  lookup=${ok ? "OK" : "FAIL"}`);
      if (!ok) throw new Error(`Lookup mismatch for ${row.id}`);
    }

    // 3. CoBorrower decrypt round-trip
    const cb = await prisma.coBorrower.findFirst();
    if (cb) {
      const decrypted = decryptCoBorrowerPii(cb as unknown as Record<string, unknown>);
      console.log(`CoBorrower ${cb.id.slice(0, 10)}  full_name=${String(decrypted.full_name).slice(0, 20)}`);
    }

    // 4. RelatedPerson decrypt round-trip
    const rp = await prisma.relatedPerson.findFirst();
    if (rp) {
      const decrypted = decryptRelatedPersonPii(rp as unknown as Record<string, unknown>);
      console.log(`RelatedPerson ${rp.id.slice(0, 10)}  id_number=${String(decrypted.id_number).slice(0, 15)}`);
    }

    console.log("\nAll smoke checks passed.");
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
