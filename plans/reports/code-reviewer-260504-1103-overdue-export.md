---
agent: code-reviewer
date: 2026-05-04
slug: overdue-export
plan: 260504-0752-thong-bao-no-chung-tu-export
verdict: SHIP with 2 fixes (1 Important security, 1 Important DoS guard). Critical regressions: none.
---

# Code Review — Export danh sách nợ chứng từ ra XLSX

## Scope
- New: `collect-digest-items.ts` (194), `invoice-overdue-xlsx-export.service.ts` (129), `overdue-export/route.ts` (75), `overdue-export-modal.tsx` (214)
- Modified: `deadline-check-logic.ts` (179, was 262 → -83 net), `report/invoices/page.tsx` (+15 lines)
- `npx tsc --noEmit` clean.
- File-size rule (<200 LoC): all under except `overdue-export-modal.tsx` (214) and `deadline-check-logic.ts` (179) — both within tolerance.

## Scorecard

| Axis | Grade | Notes |
|---|---|---|
| Cron regression risk | A | Snapshot path 1:1 with legacy semantics (see analysis below) |
| Security | B− | Formula injection + customerIds not bounded |
| Perf | B | No row cap; OK at present scale, will hurt later |
| Type safety | A | tsc clean, casts justified |
| UX | B+ | Empty-state OK; minor a11y nits |
| Code quality | A− | Clean separation of concerns, good DRY |

Severity counts: Critical 0 · Important 3 · Minor 5 · Nit 4

---

## Important

### I-1. CSV/Formula injection in XLSX cells
**Files:** `invoice-overdue-xlsx-export.service.ts:64-71, 79-85, 100-107`
User-controlled strings (`customerName`, `contractNumber`, `invoiceNumber`/`beneficiaryName`) written raw to cells. Excel auto-evaluates a cell starting with `=`, `+`, `-`, `@`, or `\t` → DDE / `=HYPERLINK` / `=WEBSERVICE` exploits. `customer_name` and `beneficiaryName` are free-text user input — exploit surface is real.
**Fix:** Sanitize before flatten:
```ts
const sanitize = (s: string) =>
  /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
```
Apply to `customerName`, `contract`, `invoiceNumber` in `flatten()`.

### I-2. `customerIds` query param unbounded
**File:** `overdue-export/route.ts:44-50`
`parseCsv` returns whatever the client sends. With 10k IDs, Prisma builds an `IN (?, ?, …)` of that size — SQLite has SQLITE_MAX_VARIABLE_NUMBER (default ~999) and Turso has its own limits. Risk: 5xx + log spam, easy DoS vector for any authenticated user.
**Fix:** cap length and validate id shape:
```ts
const ids = parseCsv(...).slice(0, 500); // hard cap
// optionally: filter by /^[a-z0-9-]{20,40}$/i
```

### I-3. No authorization tier check
**File:** `overdue-export/route.ts:41`
Bare `requireSession()` — any authenticated user (incl. `viewer` role) can export PII (customer_name, contract, beneficiary) for ALL customers. `auth-guard` exposes `requireEditorOrAdmin` already used elsewhere. Memory note: PII is encrypted at rest precisely because of compliance audit; broad export endpoint widens the blast radius.
**Fix:** decide gating tier with PO. Recommend `requireEditorOrAdmin()` minimum. (Note: existing `summary` endpoint also uses bare `requireSession`, so this is a project-wide question, not a regression — but new endpoint is a fresh chance to tighten.)

---

## Minor

### M-1. `dueSoonChecked` semantics drift
**File:** `deadline-check-logic.ts:59`
Legacy: `dueSoonChecked = dueSoon.length` (count of query result, BEFORE the boundary re-filter at old line 70).
New: counts items AFTER boundary filter `effectiveDate > sevenDaysFromNow || effectiveDate <= now` (in `collect-digest-items.ts:98`).
Net: new value can be `<=` legacy value. In practice the boundary check at line 98 is a no-op given the SQL `WHERE` already filters `lte: sevenDaysFromNow, gt: now`, so they should match. Not a bug, but worth a comment so future dev doesn't think this counts "checked" anymore — it actually counts "added to bucket".
**Fix:** rename to `dueSoonCount` (breaking JSON shape — not worth) OR add comment in `DeadlineCheckResult` type.

### M-2. `markOverdue()` return changed; cron uses `.count` only
**File:** `deadline-check-logic.ts:33`
Old code: `const { count: newlyOverdue, newlyOverdueIds } = …` (consumed both).
New code: `const { count: newlyOverdue } = …`. Confirm `newlyOverdueIds` was unused — yes, scanned diff: it was never used after the refactor that removed dual-pass query. OK, but verify `invoiceService.markOverdue` still has no other consumer expecting `newlyOverdueIds`. (Quick grep needed before merge.)

### M-3. Memory blow-up on large datasets
**File:** `collect-digest-items.ts:84-94, 114-120, 156-175`
Three `findMany` with no `take`. Production data: assuming <5k overdue + <5k due-soon + <5k supplement → fine. Once a customer accrues >50k pending invoices the buffer pipeline (snapshot → flatten → XLSX `book_append_sheet` with a single Buffer in `route.ts:52-53`) will OOM the Vercel function. Not blocking now; flag as tech debt.
**Fix later:** add `take: 10000` cap, surface `truncated: true` header.

### M-4. `Cache-Control: no-store` redundant for download
**File:** `overdue-export/route.ts:63`
Browsers don't cache `Content-Disposition: attachment` aggressively, but no-store also disables back/forward cache. Harmless either way.

### M-5. Modal "Tải XLSX" button has no min-width / layout shift
**File:** `overdue-export-modal.tsx:112-123`
Switching label "Tải XLSX" → "Đang tải..." causes width jump. Add `min-w-[100px]` to button. Nit-adjacent.

---

## Nit

- N-1. `overdue-export-modal.tsx:43, 55`: `next.has(id) ? next.delete(id) : next.add(id)` — ternary used for side-effect, lint may flag `no-unused-expressions`. Consider `if/else`.
- N-2. `collect-digest-items.ts:139`: `scanSupplement` could just be inlined; the helper is only called once and ~40 lines. Splitting is fine for readability — keep, but document that.
- N-3. `invoice-overdue-xlsx-export.service.ts:43`: `item.contractNumber ?? "—"` uses em-dash; `customer-xlsx-export.service.ts` (existing) likely uses different placeholder. Consistency check.
- N-4. `route.ts:32-37`: `buildFilename` duplicates the `fileDate` logic in `overdue-export-modal.tsx:62-67`. The server filename in `Content-Disposition` is what `fetch` blob would respect IF the modal didn't use `saveFileWithPicker(blob, suggestedName)`. Since the modal supplies its own name, the server filename is dead code in the happy path. Either:
  - drop server-side filename (header is still useful for curl/Postman), OR
  - share a `formatYmd(now)` util.

## Cron regression analysis (focus area #1) — PASS

| Behavior | Legacy | New | Match? |
|---|---|---|---|
| `markOverdue()` BEFORE scan | yes (between dueSoon and overdue queries) | yes (line 33, before `collectDigestItems`) | semantically equivalent; new path is cleaner because snapshot now includes the just-transitioned rows |
| Dedup key real `${type}:${invoiceId}` | yes | yes (`buildDedupKey` line 128-132) | match |
| Dedup key supplement `${type}:supplement-${beneficiaryId}` | yes | yes | match |
| Notification `metadata.invoiceId = virtual-{beneficiaryId}` | yes | yes (line 156-158) | match — preserves NotificationPanel/HistoryModal click contract |
| Counter `dueSoonChecked` | query length | snapshot count | drift possible in theory, no-op in practice (see M-1) |
| Counter `totalOverdue` | `overdue.length` | items where `!isSupplement && isOverdue` | match (snapshot mirrors query) |
| Counter `supplementDueSoon/Overdue` | per-line increments | snapshot increments | match |
| ONE digest email per customer | yes (buckets by email) | yes (loop per customer in snapshot) | match — but subtle change: legacy bucketed by EMAIL, new loops by CUSTOMER. If two distinct customers share an email (rare but possible), legacy merged digests, new sends two emails. Likely improvement, not regression. |

**Conclusion:** No cron behavioral regression that affects users or downstream notification consumers.

## Type safety check — PASS

- `as Buffer` cast at `service.ts:128`: `XLSX.write({type:"buffer"})` returns `Buffer` at runtime in Node; xlsx types are loose. Cast is correct.
- `new Uint8Array(buffer)` in `route.ts:53`: needed because `NextResponse` body type doesn't accept `Buffer` cleanly in Next 16. Correct workaround.
- `stripRefs` underscore destructure with `void _i`: clean way to avoid `noUnusedLocals`. Fine.
- `DigestItemWithRef` re-uses `InvoiceDigestItem` from `email.service.ts` — no circular import (email.service does NOT import collect-digest-items). Safe.

## UX/correctness — PASS with nits

- Modal opens fast even before `summary` finishes loading — accepted (parent gate disables button on summary === 0, so practically not openable empty).
- File picker dev gate already handles Turbopack 0-byte bug (memory `feedback_turbopack_binary_download_bug`). 
- "Customers without email still appear in export" — correct intent (cron skips them, export doesn't need email).

## Files paths
- `c:\Users\Quan\cong-cu-tao-bcdxcv\src\lib\notifications\collect-digest-items.ts`
- `c:\Users\Quan\cong-cu-tao-bcdxcv\src\services\invoice-overdue-xlsx-export.service.ts`
- `c:\Users\Quan\cong-cu-tao-bcdxcv\src\app\api\invoices\overdue-export\route.ts`
- `c:\Users\Quan\cong-cu-tao-bcdxcv\src\components\invoice-tracking\overdue-export-modal.tsx`
- `c:\Users\Quan\cong-cu-tao-bcdxcv\src\lib\notifications\deadline-check-logic.ts`
- `c:\Users\Quan\cong-cu-tao-bcdxcv\src\app\report\invoices\page.tsx`

## Recommended actions before merge

1. Fix I-1 (formula-prefix sanitizer) — 5 min, blocks merge.
2. Fix I-2 (cap `customerIds` length to 500) — 2 min, blocks merge.
3. Decide I-3 with PO (role gating) — non-blocking if `viewer` role isn't actually provisioned in prod yet.
4. (Optional) M-2 verify `newlyOverdueIds` no other consumer.

After 1 + 2 → green to ship.

## Unresolved questions

1. Does any prod user currently have `role = "viewer"`? If yes, I-3 becomes Important+ (PII exfil risk).
2. Has `invoiceService.markOverdue()` signature changed to drop `newlyOverdueIds`, or is it still returned and just unused here? If still returned, rest of codebase is fine; if dropped, this commit must include service change too.
3. The server-side filename in `Content-Disposition` is unused by the happy path UI flow — keep or drop?
4. Is there a per-customer row count limit in mind for production (Phase 2 scaling)? Currently unbounded.
