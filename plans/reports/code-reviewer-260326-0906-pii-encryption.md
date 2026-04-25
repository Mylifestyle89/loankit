# Code Review: PII Field Encryption (AES-256-GCM)

**Date:** 2026-03-26 | **Reviewer:** code-reviewer | **Focus:** Security, edge cases, API, UI

## Scope

- Files: 9 (1 new lib, 1 new script, 7 modified)
- LOC: ~400 net new
- Scout findings: 6 edge-case gaps (see below)

## Overall Assessment

Encryption lib is well-structured: correct AES-256-GCM usage, proper IV randomness, authenticated encryption with tag. The `enc:` prefix approach for backward compat is pragmatic. However, there are **several PII leak paths** the implementation missed and one **critical security gap** on the reveal endpoint.

---

## Critical Issues

### C1. `?reveal=` endpoint has NO authentication check

`src/app/api/customers/[id]/route.ts` GET handler does NOT call `requireSession()` or any auth guard before returning raw PII via `?reveal=customer_code,phone,cccd`. Any unauthenticated request can fetch decrypted PII.

**Impact:** Complete PII exposure to unauthenticated users.

**Fix:** Add auth check before reveal:
```ts
// At the top of GET handler, before reveal logic:
if (revealParam) {
  await requireEditorOrAdmin(); // or requireSession() at minimum
}
```

### C2. PATCH response leaks encrypted ciphertext

`PATCH /api/customers/[id]` (line 91) returns raw `customer` object from `customerService.updateCustomer()`. The service calls `toUpdateDbData(input)` which encrypts, then Prisma returns the row with encrypted values (`enc:...`). The response is NOT decrypted or masked.

**Impact:** API consumer sees `enc:<base64>:<base64>:<base64>` strings. Not a direct PII leak but exposes ciphertext (aids cryptanalysis) and breaks frontend display.

**Fix:**
```ts
const customer = await customerService.updateCustomer(id, parsed);
const decrypted = decryptCustomerPii(customer);
const masked = maskCustomerResponse(decrypted);
return NextResponse.json({ ok: true, customer: masked });
```

### C3. POST `/api/customers` response leaks encrypted data

Same issue as C2. `createCustomer()` returns Prisma row with encrypted fields, returned raw at line 69.

---

## High Priority

### H1. CoBorrower phone: encrypted on write (saveFromDraft) but NOT on read/API

- `GET /api/customers/:id/co-borrowers` returns raw Prisma rows (line 15 of `co-borrowers/route.ts`). If phone was encrypted via `saveFromDraft`, the response contains `enc:...` ciphertext.
- `POST /api/customers/:id/co-borrowers` writes plaintext phone (line 42) -- no encryption.
- `PATCH /api/customers/:id/co-borrowers/:cobId` same -- no encryption on write, no decryption on read.

**Impact:** Inconsistent encryption; CoBorrower phone only encrypted when created via BK import, not via direct API.

**Fix:** Add encrypt on write and decrypt on read for CoBorrower phone in the API routes, or create a helper similar to `encryptCustomerPii` for CoBorrower.

### H2. `to-draft` API endpoint returns decrypted PII without masking

`POST /api/customers/to-draft` (route.ts line 16-19) returns `result.customer` and `result.values` which contain fully decrypted PII (CIF, CCCD, phone). No masking, no auth check.

**Impact:** Full PII accessible via this endpoint.

**Note:** This may be intentional for BK editing, but should at minimum require `requireEditorOrAdmin()`.

### H3. `from-draft` response returns customer with encrypted fields

`POST /api/customers/from-draft` returns `result.customer` which comes from `saveFromDraft` -- the Customer object has encrypted fields in DB columns. Response not decrypted.

### H4. `data-io.service.ts` exportData returns raw encrypted data

`exportData()` and `fullCustomerBatches()` call `prisma.customer.findMany()` directly without decryption. Exported JSON will contain `enc:...` strings for PII fields.

**Impact:** Data export/import broken after migration. Import would re-encrypt already-encrypted values (though `encryptCustomerPii` guards against this with `isEncrypted` check).

### H5. `khcn-report-data-loader.ts` returns encrypted data for DOCX

`loadFullCustomer()` returns raw Prisma result without decryption. If DOCX template rendering uses this directly, CIF/phone/CCCD will render as `enc:...` ciphertext in generated documents.

**Impact:** Broken DOCX output for all PII fields.

**Fix:** Add `decryptCustomerPii()` call:
```ts
const c = await prisma.customer.findUnique({ ... });
if (!c) throw new NotFoundError("Customer not found.");
return decryptCustomerPii(c);
```
Also decrypt CoBorrower phone in the returned `co_borrowers`.

### H6. `getKey()` called on every encrypt/decrypt -- no caching

`getKey()` parses hex and creates Buffer on every call. In `listCustomers` with 200 customers x 4 PII fields = 800 Buffer.from calls per request.

**Impact:** Minor perf waste. Not blocking.

**Fix:** Cache the key:
```ts
let _keyCache: Buffer | null = null;
function getKey(): Buffer {
  if (_keyCache) return _keyCache;
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) throw new Error("...");
  _keyCache = Buffer.from(hex, "hex");
  return _keyCache;
}
```

---

## Medium Priority

### M1. `getFullProfile` mutates Prisma object via Object.assign

Line 290 in `customer.service.ts`:
```ts
Object.assign(customer, decryptCustomerPii(customer));
```
This mutates the Prisma object in-place. `decryptCustomerPii` returns a shallow copy, but `Object.assign` writes back to the original. Should use the returned copy instead:
```ts
const decrypted = decryptCustomerPii(customer);
// Use decrypted from here on
```

Same pattern at line 355 (`toDraft`).

### M2. `spouse_cccd` in PII_CUSTOMER_FIELDS but `spouse_name` is not

If spouse_name is also PII (it contains a person's name), it should be considered. Currently only `customer_code`, `phone`, `cccd`, `spouse_cccd` are encrypted. `spouse_name` and `customer_name` are not.

**Note:** May be intentional -- customer_name is used for search/lookup. Just flagging for awareness.

### M3. Migration script loads ALL customers into memory

`prisma.customer.findMany()` without pagination (line 18 of migration script). For large datasets this could OOM.

**Fix:** Use cursor-based batching (similar to `fullCustomerBatches`).

### M4. Missing error handling in PiiChip toggle

`khcn-profile-card.tsx` line 108-109: `fetch` call has no error handling for network failures or non-JSON responses. `res.json()` could throw.

```ts
try {
  const res = await fetch(`/api/customers/${customerId}?reveal=${fieldKey}`);
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  // ...
} catch {
  // Show error state to user
}
```

### M5. `maskMiddle` with keepEnd=0 produces trailing empty string

For CIF mask config `keepStart: 0, keepEnd: 4` -- if value is 3 chars (shorter than keepEnd), `maskMiddle` returns `***` (all masked). This is correct per the guard `value.length <= keepStart + keepEnd`. No issue, just noting.

---

## Low Priority

### L1. `PiiChip` caches raw value in component state

Once revealed, the raw PII value stays in React state (`rawValue`). If user navigates away and back, it's gone (component unmounts). This is acceptable but could be a concern if the page has long-lived state.

### L2. `revealFields?.has("all")` -- undocumented escape hatch

`maskCustomerResponse` accepts `"all"` in revealFields set to skip all masking. This is not exposed in the API but could be called via `?reveal=all`. Should be documented or restricted.

---

## Edge Cases Found by Scout

1. **CoBorrower API routes** -- completely missing encrypt/decrypt/mask integration
2. **DOCX rendering** (`khcn-report-data-loader.ts`) -- returns encrypted data to template engine
3. **Data export** (`data-io.service.ts`) -- exports encrypted ciphertext
4. **PATCH/POST responses** -- return encrypted or unmasked data
5. **to-draft endpoint** -- returns fully decrypted PII without auth
6. **report template.service.ts** -- direct `prisma.customer.findUnique` calls without decrypt (lines 195, 219, 297)

---

## Positive Observations

- AES-256-GCM with random IV per field -- cryptographically sound
- `enc:` prefix for backward compatibility during migration -- pragmatic
- `isEncrypted` guard prevents double-encryption
- Dry-run mode in migration script -- good safety net
- `maskMiddle` handles edge cases (short strings, empty strings)
- PiiChip UX with loading spinner -- good user feedback
- Key validation (64 hex chars) at runtime -- fails fast

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Add `requireEditorOrAdmin()` to GET handler when `reveal` param is present
2. **[CRITICAL]** Mask/decrypt PATCH and POST responses in customer API routes
3. **[HIGH]** Add decrypt to `khcn-report-data-loader.ts` for DOCX rendering
4. **[HIGH]** Add encrypt/decrypt to CoBorrower API routes
5. **[HIGH]** Add decrypt to `data-io.service.ts` export functions
6. **[HIGH]** Decrypt in `from-draft` response; add auth to `to-draft`
7. **[MEDIUM]** Fix `Object.assign` mutation in `getFullProfile` and `toDraft`
8. **[MEDIUM]** Cache encryption key Buffer
9. **[MEDIUM]** Add batching to migration script
10. **[LOW]** Add error handling to PiiChip fetch

---

## Metrics

- Type Coverage: Good -- generics on batch helpers, PiiType union
- Test Coverage: Unknown -- no tests for encryption lib observed
- Linting Issues: 0 observed

## Unresolved Questions

1. Should `customer_name` and `spouse_name` be encrypted? They are PII but used for search/lookup.
2. Should `email` and `bank_account` be added to PII fields? They are sensitive data.
3. Is `to-draft` intentionally unauthenticated? It returns full decrypted PII.
4. Are there other services with direct `prisma.customer.find*` calls that need decrypt? (report `_shared.ts` line 227, `invoice.service.ts` line 298, `template.service.ts` lines 195/219/297, `mapping-instance.service.ts` line 28)
5. Should encryption be tested with unit tests before deployment?
