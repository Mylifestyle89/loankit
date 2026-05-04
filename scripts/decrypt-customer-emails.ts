/**
 * decrypt-customer-emails.ts
 * One-shot migration: decrypt all `Customer.email` rows stored as `enc:...`
 * back to plaintext, after `email` was removed from PII_CUSTOMER_FIELDS.
 *
 * Idempotent: skips rows that don't have the encryption prefix.
 * Run on every environment that has encrypted emails (dev local, VPS staging).
 *
 *   npx tsx scripts/decrypt-customer-emails.ts        # apply
 *   npx tsx scripts/decrypt-customer-emails.ts --dry  # preview only
 */
import { PrismaClient } from "@prisma/client";

import { decryptField, isEncrypted } from "@/lib/field-encryption";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

async function main() {
  const rows = await prisma.customer.findMany({
    where: { email: { not: null } },
    select: { id: true, email: true },
  });

  let scanned = 0;
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    scanned++;
    if (!row.email || !isEncrypted(row.email)) {
      skipped++;
      continue;
    }
    try {
      const plaintext = decryptField(row.email);
      if (DRY) {
        console.log(`[dry] ${row.id}: <encrypted> → ${plaintext}`);
      } else {
        await prisma.customer.update({
          where: { id: row.id },
          data: { email: plaintext },
        });
      }
      migrated++;
    } catch (err) {
      failed++;
      console.error(
        `[err] ${row.id}: decrypt failed — ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  console.log(
    `\n${DRY ? "[DRY-RUN] " : ""}Done. scanned=${scanned} migrated=${migrated} skipped(plaintext)=${skipped} failed=${failed}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
