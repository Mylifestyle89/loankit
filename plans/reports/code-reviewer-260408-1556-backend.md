# Code Review — Backend Scope

**Date:** 2026-04-08 15:56
**Scope:** `src/app/api/**`, `src/services/**`, `src/lib/**` (server), `src/proxy.ts`, `prisma/schema.prisma`, `report_pipeline/**`
**Coverage:** ~107 route files, ~60 lib files, ~45 service files, 1 proxy, 1 schema, 5 py files
**Deployment context:** Vercel, single-user (anh Quân)

## Overall Assessment

Auth layering has systemic gap: proxy only checks cookie *presence*, many mutating routes rely entirely on proxy without calling `requireSession/requireAdmin/requireEditor`. Field-encryption is real AES-256-GCM but coverage incomplete + encrypted `customer_code` breaks unique constraint + import lookup. Transaction patterns solid. Rate-limiting in-memory (documented). No shell injection risks. Significant service-file bloat (>200 LOC).

**Single-user Vercel context:** C2 exploitation risk lowered (no other users), but still fix because cheap. C1/C3 unchanged — data integrity + compliance.

---

## CRITICAL

### C1. PII encryption breaks `Customer.customer_code` unique lookup & constraint

- `customer-service-helpers.ts:72` encrypts `customer_code` before every write using random IV (`field-encryption.ts:25`); schema has `@unique` on `customer_code` (`schema.prisma:103`).
- `src/services/report/data-io-import.service.ts:147` does `where: { customer_code: { in: allCustomerCodes } }` with **plaintext** codes — NEVER matches encrypted DB values → import silently creates duplicates.
- Uniqueness semantically broken: two customers with same CIF get different ciphertexts → unique constraint passes but plaintext collision undetected.
- **Fix:** store CIF plaintext + separate deterministic HMAC-SHA256 column for uniqueness/lookup; OR deterministic AES-SIV. Current setup is compliance + data-integrity failure.

### C2. Missing auth on sensitive non-customer routes

Routes rely on proxy cookie-presence only (no role/session validation inside handler):

- `GET /api/customers/[id]` — `customers/[id]/route.ts:41`
- `GET /api/customers` — `customers/route.ts:27`
- `GET /api/loans/[id]` — `loans/[id]/route.ts:53`
- `PUT /api/report/template/save-docx` — overwrites DOCX templates (`report/template/save-docx/route.ts:11`)
- `POST /api/report/build` — triggers python pipeline (`report/build/route.ts:8`)
- `POST /api/report/snapshots/restore` — restores state (`report/snapshots/restore/route.ts:13`)
- `GET /api/report/backups/restore` — reads backup content (`report/backups/restore/route.ts:7`)
- `GET /api/report/file/token` — issues HMAC tokens for any DOCX without session (`report/file/token/route.ts:9`)
- `GET /api/notifications` — `notifications/route.ts:8`
- `GET /api/dashboard` — low risk (counts)

Proxy only calls `getSessionCookie` (presence check). Audit: ~30/107 route files (28%) call auth helpers.

**Single-user context:** severity drops to **Important** (no other users), but fix because trivial.

### C3. Incomplete PII encryption scope

`PII_CUSTOMER_FIELDS` (`field-encryption.ts:80`) = `[customer_code, phone, cccd, spouse_cccd]`.

Unencrypted PII fields in schema:

- `Customer.cccd_old`, `bank_account`, `spouse_name`, `date_of_birth`, `cccd_issued_date`, `cccd_issued_place`, `email`
- Entire `CoBorrower` model: `full_name`, `id_number`, `id_old`, `phone`, `current_address`, `permanent_address`, `birth_year`
- `RelatedPerson.id_number`, `address`
- `CreditAtAgribank.*`, `CreditAtOther.*` (arguably PII)

Agribank scan policy per memory requires AES-256-GCM for PII → compliance gap.

---

## IMPORTANT

### I1. Two conflicting `withErrorHandling` wrappers (DRY)

- `src/lib/api/with-error-handling.ts` — handles Zod/AppError/AuthError, returns `{ok:false,error}`.
- `src/lib/api-helpers.ts:55` — different signature (errorMessage arg), doesn't map AuthError/Zod.
- Both imported under same name across codebase → subtle bugs (missing 401/400 mapping). Consolidate into single wrapper in `lib/api/`.

### I2. File-access token uses random-per-restart default secret

`src/lib/report/file-token.ts:11` — `FILE_ACCESS_SECRET ?? randomBytes(32)`. Silent fallback risky: misconfiguration on Vercel loses tokens on cold-start and combined with C2 means tokens are ONLY gate for file download. Require `FILE_ACCESS_SECRET` set (throw at boot if missing in production). TTL 10min OK. Also verify IP/session binding in token payload.

### I3. `getClientIp` falls back to global bucket

`rate-limiter.ts:64-68` — warns but returns `"global"` → all users share one 60/min bucket when `TRUSTED_PROXY=false` and no `x-real-ip`. One noisy client blocks everyone. Either require trusted proxy config or use per-session/user key as fallback.

### I4. `proxy.ts` dead path reference

`ONLYOFFICE_CALLBACK = "/api/onlyoffice/callback"` whitelisted but route does not exist. Remove.

### I5. `deleteCustomer` does not load relations before delete

`customer.service.ts:167` — relies on schema `onDelete: Cascade`. Works, but no audit trail, silently drops encrypted customer history. Consider soft-delete for compliance/retention.

### I6. `data-io-import.service.ts` (389 LOC) — N+1 avoidance relies on broken lookups (C1). Lookup uses `beneficiary.name` + `accountNumber` to de-dupe (`l.155–168`) — fragile fuzzy matching.

### I7. `customer-service-helpers.ts:toUpdateDbData` re-encrypts on every update

- Unchanged CIF gets new ciphertext each PATCH → wasteful.
- Worse, any `findUnique({ where: { customer_code } })` comparison impossible.

### I8. `validateRelativePath` runs before `validatePathUnderBase` (defense-in-depth) — good, but `save-docx` uses ad-hoc checks (`relPath.includes("..") || path.isAbsolute`) instead of shared helper → inconsistent. Route should call `validatePathUnderBase`.

### I9. `auth.ts` 2FA toggle gated by `ENABLE_2FA==="true"` at import time

Changes require server restart. Acceptable per memory, but no startup log confirming 2FA state. Add `console.info("[auth] 2FA=", enabled)`.

### I10. `cron/invoice-deadlines/route.ts:20` — `safeCompare` reads `Buffer.from(secret)` then `timingSafeEqual`. If lengths differ (byte vs string for non-ASCII) could fail. Low impact (secrets ASCII).

### I11. `maskPiiField` masks short values weirdly

`field-encryption.ts:73` calls `maskMiddle(raw, keepStart, keepEnd)` — for CIF len<4, `keepEnd:4` returns full value unmasked. Verify `maskMiddle` behavior.

---

## NICE-TO-HAVE

### N1. Files > 200 LOC (modularize per project rule)

- `src/services/report/data-io-import.service.ts` (389)
- `src/services/bk-to-customer-relations.ts` (359)
- `src/services/disbursement.service.ts` (324)
- `src/services/report/customer-xlsx-io.service.ts` (314)
- `src/services/khcn-builder-loan-plan.ts` (308)
- `src/services/auto-process.service.ts` (305)
- `src/services/document-extraction.service.ts` (298)
- `src/services/disbursement-report.service.ts` (295)
- `src/services/khcn-builder-collateral-land.ts` (286)
- `src/services/report/template-field-operations.service.ts` (280)
- `src/services/report/build.service.ts` (275)
- `src/services/customer-draft.service.ts` (267)
- `src/services/khcn-report-data-builder.ts` (267)
- `src/services/report/_migration-internals.ts` (263)
- `src/lib/docx-engine.ts` (259)
- `src/services/report/_shared.ts` (240)
- `src/services/financial-analysis.service.ts` (215)
- `src/services/invoice-queries.service.ts` (208)
- `src/lib/i18n/translations.ts` (1032) — translations file, exempt but consider splitting per-feature

### N2. `customers/[id]/route.ts` redundant error-handling blocks — wrap with `withErrorHandling`.

### N3. `dashboard/route.ts` swallows errors as `e instanceof Error ? e.message : "Unknown error"` — leaks internals. Use `toHttpError` + generic 500.

### N4. `customer.service.ts:getFullProfile` uses `Object.assign(customer, decryptCustomerPii(customer))` in-place on prisma object — hacky.

### N5. Cookie cache: `session.cookieCache.maxAge: 5*60` — role changes take up to 5 min. Document.

### N6. `deadline-scheduler.ts:9` — verify scheduler stops when `CRON_SECRET` set.

### N7. Python pipeline: `builder.py` no try/except in `set_nested`. Use `validator.py` upstream.

### N8. `withRateLimit` in `api-helpers.ts` and `checkRateLimit` in `rate-limiter.ts` duplicate state (two maps).

### N9. Dead/unused: `ONLYOFFICE_CALLBACK` proxy rule, possibly `auth-utils.ts`.

---

## Recommended Actions (Priority Order)

1. **Fix PII encryption model** (C1, C3): deterministic HMAC lookup column for CIF, extend PII scope to all CCCD/phone/address/id_number fields in CoBorrower/RelatedPerson. Migration + re-encrypt existing rows.
2. **Add explicit auth helpers to mutating routes** (C2). Minimum: `save-docx`, `build`, `snapshots/restore`, `backups/restore`, `file/token`, customer/loan GETs. Central `withAuth(role)` wrapper combined with single `withErrorHandling`.
3. **Consolidate `withErrorHandling`** (I1) — delete duplicate in `api-helpers.ts`.
4. **Require `FILE_ACCESS_SECRET`** and bind token to session/user (I2).
5. **Modularize > 200 LOC service files** (N1).
6. Remove dead `ONLYOFFICE_CALLBACK` rule (I4).
7. Log effective 2FA state at boot (I9).

## Metrics

- Routes audited (deep): 18
- Services spot-checked: 6
- Lib files reviewed: 9
- Files > 200 LOC (backend): 18
- Routes with explicit auth helpers: ~30/107 (28%)
- PII fields encrypted: 4/~15 identified

## Unresolved Questions

1. Is `customer_code` ever looked up by plaintext outside `data-io-import.service.ts`?
2. Does `better-auth` `getSessionCookie` validate signature or just name match? Determines C2 real exploit path.
3. Is `/api/onlyoffice/callback` planned or cruft?
4. Compliance audit logs needed for customer delete/update?
5. Is dual `withErrorHandling` causing observed production bugs (401/400 not reaching client)?
6. Does `maskMiddle` handle len < keepStart+keepEnd safely?
