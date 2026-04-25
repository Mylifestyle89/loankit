# Phase 5: Data Migration Script

**Priority:** Critical | **Effort:** S | **Status:** Pending | **Blocked by:** Phase 1

## Overview

One-time script to encrypt existing plaintext PII data in DB.

## Implementation

New file: `scripts/encrypt-existing-pii-data.ts`

```typescript
// Run: npx tsx scripts/encrypt-existing-pii-data.ts [--dry-run]

import { PrismaClient } from "@prisma/client";
import { encryptField, isEncrypted } from "../src/lib/field-encryption";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

const PII_FIELDS = ["customer_code", "phone", "cccd", "spouse_cccd"] as const;

async function migrateCustomers() {
  const customers = await prisma.customer.findMany();
  let encrypted = 0;

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
        console.log(`[DRY] Would encrypt ${Object.keys(updates).join(",")} for customer ${c.id}`);
      } else {
        await prisma.customer.update({ where: { id: c.id }, data: updates });
      }
      encrypted++;
    }
  }
  console.log(`Customers: ${encrypted} encrypted (${DRY_RUN ? "dry run" : "committed"})`);
}

async function migrateCoBorrowers() {
  const coBorrowers = await prisma.coBorrower.findMany();
  let encrypted = 0;

  for (const cb of coBorrowers) {
    if (cb.phone && !isEncrypted(cb.phone)) {
      if (DRY_RUN) {
        console.log(`[DRY] Would encrypt phone for coBorrower ${cb.id}`);
      } else {
        await prisma.coBorrower.update({
          where: { id: cb.id },
          data: { phone: encryptField(cb.phone) },
        });
      }
      encrypted++;
    }
  }
  console.log(`CoBorrowers: ${encrypted} encrypted (${DRY_RUN ? "dry run" : "committed"})`);
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log("⚠️  BACKUP YOUR DATABASE BEFORE RUNNING IN LIVE MODE");
  await migrateCustomers();
  await migrateCoBorrowers();
  console.log("Done.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

## Execution Plan

1. **Backup DB** (`cp prisma/dev.db prisma/dev.db.bak`)
2. **Dry run** → `npx tsx scripts/encrypt-existing-pii-data.ts --dry-run`
3. **Review output** → confirm correct fields/counts
4. **Live run** → `npx tsx scripts/encrypt-existing-pii-data.ts`
5. **Verify** → query DB, confirm `enc:` prefix on all PII fields

## Todo

- [ ] Create `scripts/encrypt-existing-pii-data.ts`
- [ ] Test with --dry-run
- [ ] Backup DB
- [ ] Run live migration
- [ ] Verify encrypted data in DB

## Success Criteria

- [ ] All customer CIF/phone/CCCD in DB start with `enc:`
- [ ] All CoBorrower phone in DB start with `enc:`
- [ ] App still works (service layer decrypts transparently)
- [ ] DOCX export correct
