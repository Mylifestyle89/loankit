/**
 * Audit current PII encryption state on whatever database this process
 * points at. Counts how many rows have encrypted vs plaintext values for
 * each PII field, so we know what the backfill will face.
 *
 * Run against local dev.db:
 *   npx tsx scripts/audit-pii-encryption-state.ts
 *
 * Read-only — never writes.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { resolve } from "node:path";

const ENCRYPTED_PREFIX = "enc:";

function classify(value: unknown): "plaintext" | "encrypted" | "null" {
  if (value == null) return "null";
  if (typeof value !== "string") return "plaintext";
  return value.startsWith(ENCRYPTED_PREFIX) ? "encrypted" : "plaintext";
}

type Counter = { encrypted: number; plaintext: number; null: number };
function newCounter(): Counter {
  return { encrypted: 0, plaintext: 0, null: 0 };
}

function printBlock(title: string, total: number, counters: Record<string, Counter>) {
  console.log(`\n=== ${title} (${total} rows) ===`);
  const fields = Object.keys(counters);
  const w = Math.max(...fields.map((f) => f.length), 20);
  for (const field of fields) {
    const c = counters[field];
    console.log(
      `  ${field.padEnd(w)}  enc: ${String(c.encrypted).padStart(4)}  plain: ${String(c.plaintext).padStart(4)}  null: ${String(c.null).padStart(4)}`,
    );
  }
}

async function main() {
  const dbPath = resolve(process.cwd(), "prisma/dev.db");
  const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
  const prisma = new PrismaClient({ adapter });
  console.log(`Auditing: ${dbPath}`);

  try {
    // ─── Customer ──────────────────────────────────────────────
    const customerFields = [
      "customer_code",
      "phone",
      "cccd",
      "spouse_cccd",
      "cccd_old",
      "bank_account",
      "spouse_name",
      "date_of_birth",
      "email",
    ];
    const customers = await prisma.customer.findMany({
      select: Object.fromEntries(customerFields.map((f) => [f, true])),
    });
    const custCounters: Record<string, Counter> = Object.fromEntries(
      customerFields.map((f) => [f, newCounter()]),
    );
    for (const row of customers) {
      for (const f of customerFields) {
        const v = (row as Record<string, unknown>)[f];
        custCounters[f][classify(v)]++;
      }
    }
    printBlock("Customer", customers.length, custCounters);

    // ─── CoBorrower ────────────────────────────────────────────
    const coBorrowerFields = [
      "full_name",
      "id_number",
      "id_old",
      "phone",
      "current_address",
      "permanent_address",
      "birth_year",
    ];
    const coBorrowers = await prisma.coBorrower.findMany({
      select: Object.fromEntries(coBorrowerFields.map((f) => [f, true])),
    });
    const cbCounters: Record<string, Counter> = Object.fromEntries(
      coBorrowerFields.map((f) => [f, newCounter()]),
    );
    for (const row of coBorrowers) {
      for (const f of coBorrowerFields) {
        const v = (row as Record<string, unknown>)[f];
        cbCounters[f][classify(v)]++;
      }
    }
    printBlock("CoBorrower", coBorrowers.length, cbCounters);

    // ─── RelatedPerson ─────────────────────────────────────────
    const relatedFields = ["id_number", "address"];
    const relatedPersons = await prisma.relatedPerson.findMany({
      select: Object.fromEntries(relatedFields.map((f) => [f, true])),
    });
    const rpCounters: Record<string, Counter> = Object.fromEntries(
      relatedFields.map((f) => [f, newCounter()]),
    );
    for (const row of relatedPersons) {
      for (const f of relatedFields) {
        const v = (row as Record<string, unknown>)[f];
        rpCounters[f][classify(v)]++;
      }
    }
    printBlock("RelatedPerson", relatedPersons.length, rpCounters);

    // ─── Ciphertext variety for customer_code (detect random IV) ──
    // If the same plaintext CIF appears twice (it shouldn't after dedup),
    // both ciphertexts will still differ — this just confirms the bug.
    const encryptedCodes = customers
      .map((c) => (c as Record<string, unknown>).customer_code)
      .filter((v): v is string => typeof v === "string" && v.startsWith(ENCRYPTED_PREFIX));
    const uniqueCiphertexts = new Set(encryptedCodes).size;
    console.log(
      `\ncustomer_code ciphertexts: ${encryptedCodes.length} encrypted / ${uniqueCiphertexts} unique`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
