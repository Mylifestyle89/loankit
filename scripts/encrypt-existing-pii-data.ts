/**
 * One-time migration: encrypt existing plaintext PII data in DB.
 * Usage:
 *   npx tsx scripts/encrypt-existing-pii-data.ts --dry-run   # preview only
 *   npx tsx scripts/encrypt-existing-pii-data.ts              # live encryption
 *
 * ⚠️ BACKUP YOUR DATABASE BEFORE RUNNING IN LIVE MODE!
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { encryptField, isEncrypted } from "../src/lib/field-encryption";
const DRY_RUN = process.argv.includes("--dry-run");

const PII_FIELDS = ["customer_code", "phone", "cccd", "spouse_cccd"] as const;

async function migrateCustomers() {
  const customers = await prisma.customer.findMany();
  let count = 0;

  for (const c of customers) {
    const updates: Record<string, string> = {};
    for (const field of PII_FIELDS) {
      const val = c[field as keyof typeof c] as string | null;
      if (val && !isEncrypted(val)) {
        updates[field] = encryptField(val);
      }
    }
    if (Object.keys(updates).length > 0) {
      if (DRY_RUN) {
        console.log(`[DRY] Customer ${c.id}: would encrypt ${Object.keys(updates).join(", ")}`);
      } else {
        await prisma.customer.update({ where: { id: c.id }, data: updates });
      }
      count++;
    }
  }
  console.log(`Customers: ${count} records ${DRY_RUN ? "would be" : ""} encrypted`);
}

async function migrateCoBorrowers() {
  const coBorrowers = await prisma.coBorrower.findMany();
  let count = 0;

  for (const cb of coBorrowers) {
    if (cb.phone && !isEncrypted(cb.phone)) {
      if (DRY_RUN) {
        console.log(`[DRY] CoBorrower ${cb.id}: would encrypt phone`);
      } else {
        await prisma.coBorrower.update({
          where: { id: cb.id },
          data: { phone: encryptField(cb.phone) },
        });
      }
      count++;
    }
  }
  console.log(`CoBorrowers: ${count} records ${DRY_RUN ? "would be" : ""} encrypted`);
}

async function main() {
  console.log(`\n=== PII Encryption Migration ===`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "⚠️  LIVE — writing to DB"}\n`);

  await migrateCustomers();
  await migrateCoBorrowers();

  console.log(`\nDone.`);
}

main()
  .catch((err) => { console.error("Migration failed:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
