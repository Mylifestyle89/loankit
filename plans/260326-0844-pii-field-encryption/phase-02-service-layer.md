# Phase 2: Service Layer Integration

**Priority:** Critical | **Effort:** M | **Status:** Pending | **Blocked by:** Phase 1

## Overview

Integrate encrypt/decrypt into `customer.service.ts` and `customer-service-helpers.ts`. All PII fields encrypted before DB write, decrypted after DB read.

## Context Links

- `src/services/customer.service.ts` — main service
- `src/services/customer-service-helpers.ts` — `toCreateDbData`, `toUpdateDbData`

## Related Code Files

**Modify:**
- `src/services/customer-service-helpers.ts` — encrypt in `toCreateDbData`/`toUpdateDbData`
- `src/services/customer.service.ts` — decrypt after reads, encrypt in `saveFromDraft`

## PII Fields to Encrypt/Decrypt

| Field | Model | Encrypt on write | Decrypt on read |
|-------|-------|-----------------|-----------------|
| `customer_code` | Customer | ✓ | ✓ |
| `phone` | Customer | ✓ | ✓ |
| `cccd` | Customer | ✓ | ✓ |
| `spouse_cccd` | Customer | ✓ | ✓ |
| `phone` | CoBorrower | ✓ | ✓ |

## Implementation Steps

### Step 1: Helper function for batch encrypt/decrypt

```typescript
// In field-encryption.ts, add:
const PII_CUSTOMER_FIELDS = ["customer_code", "phone", "cccd", "spouse_cccd"] as const;

export function encryptCustomerPii<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data };
  for (const field of PII_CUSTOMER_FIELDS) {
    const val = result[field];
    if (typeof val === "string" && val && !isEncrypted(val)) {
      (result as Record<string, unknown>)[field] = encryptField(val);
    }
  }
  return result;
}

export function decryptCustomerPii<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data };
  for (const field of PII_CUSTOMER_FIELDS) {
    const val = result[field];
    if (typeof val === "string" && isEncrypted(val)) {
      (result as Record<string, unknown>)[field] = decryptField(val);
    }
  }
  return result;
}
```

### Step 2: Modify customer-service-helpers.ts

In `toCreateDbData` and `toUpdateDbData`, wrap with `encryptCustomerPii()` before return.

### Step 3: Modify customer.service.ts

**Reads** — decrypt after Prisma query:
- `getCustomerById` → `decryptCustomerPii(customer)`
- `getFullProfile` → `decryptCustomerPii(customer)`
- `listCustomers` → `data.map(decryptCustomerPii)`
- `toDraft` → `decryptCustomerPii(customer)`

**Writes** — encrypt before Prisma write:
- `createCustomer` → already handled via `toCreateDbData`
- `updateCustomer` → already handled via `toUpdateDbData`
- `saveFromDraft` → encrypt `sharedData` before create/update

### Step 4: CoBorrower phone

In `bk-to-customer-relations.ts`:
- `extractCoBorrower` / `extractAllCoBorrowers` — encrypt `phone` field before return

OR simpler: encrypt in `saveFromDraft` after extraction, before `createMany`.

### Step 5: DOCX export verification

`khcn-report.service.ts` calls `customerService.getCustomerById` or `getFullProfile` which now returns decrypted data → DOCX export works without changes.

## Todo

- [ ] Add `encryptCustomerPii`/`decryptCustomerPii` to field-encryption.ts
- [ ] Modify `toCreateDbData`/`toUpdateDbData` to encrypt PII
- [ ] Decrypt in all read methods (getCustomerById, getFullProfile, listCustomers, toDraft)
- [ ] Encrypt `sharedData` in `saveFromDraft`
- [ ] Encrypt CoBorrower phone in saveFromDraft
- [ ] Compile check
- [ ] Verify DOCX export still works (reads decrypted data)

## Success Criteria

- [ ] New customer created → DB shows `enc:...` for CIF/phone/CCCD
- [ ] Existing customer fetched → returns decrypted plaintext
- [ ] `saveFromDraft` encrypts all PII fields
- [ ] CoBorrower phone encrypted
- [ ] DOCX export contains correct raw values
