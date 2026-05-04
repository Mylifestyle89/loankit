# Edge Case Verification Report: Frontend State, Document Processing & AI

**Date:** 2026-05-01
**Scope:** 7 edge cases across Zustand stores, notification polling, DOCX parsing, AI services, and template engine

---

## 1. Zustand Hydration Race Conditions

**Status:** HANDLED
**Severity:** Low (already mitigated)

**Evidence:**
- `src/stores/use-customer-store.ts:14` — `_hasHydrated` flag initialized as `false`
- `src/stores/use-customer-store.ts:39-41` — `onRehydrateStorage` callback sets `_hasHydrated = true` after localStorage read
- `src/stores/use-customer-store.ts:47-49` — `useIsCustomerStoreHydrated()` exported for components
- `src/stores/use-customer-store.ts:63-66` — `useSelectedCustomer()` returns `null` when `!isHydrated`, preventing stale render

**Assessment:** Correctly implemented. `partialize` (line 38) only persists `selectedCustomerId`, so the customer list is always re-fetched from API -- no stale list risk. The `useMemo` in `useSelectedCustomer` also guards against orphan IDs (returns `null` if ID not found in list).

---

## 2. Customer Store Stale Data on Deletion

**Status:** PARTIAL
**Severity:** Medium

**Evidence:**
- `src/components/customers/customer-list-view.tsx:99-105` — `handleDelete` calls API then `loadCustomers()` to refresh list, but does NOT clear `selectedCustomerId`
- After deletion, `loadCustomers()` refreshes `customers[]` via `setCustomers()`, so `useSelectedCustomer()` returns `null` (ID not found in list) -- functionally correct
- However, `selectedCustomerId` persists in localStorage pointing to a deleted customer ID
- On next page load, `selectedCustomerId` will still be the deleted ID until customer list loads and `useSelectedCustomer()` returns `null`

**Impact:** No data corruption. The `useSelectedCustomer()` null-guard (line 65: `?? null`) prevents accessing deleted customer data. But:
- Minor UX issue: dropdown/indicator may flash briefly between hydration and list load
- localStorage retains orphan ID until user selects another customer

**Recommendation:** Add `setSelectedCustomerId("")` in `handleDelete` when `id === selectedCustomerId`:
```ts
if (data.ok) {
  if (selectedCustomerId === id) setSelectedCustomerId("");
  void loadCustomers();
}
```

---

## 3. Notification Polling Memory Leaks

**Status:** UNHANDLED
**Severity:** High

**Evidence:**
- `src/components/invoice-tracking/use-notification-store.ts:75-79` — `startPolling()` creates `setInterval(60_000)` and stores ID in `_pollingId`
- `src/components/invoice-tracking/use-notification-store.ts:82-86` — `stopPolling()` exists and properly calls `clearInterval`
- `src/components/invoice-tracking/notification-bell.tsx:18-20` — `useEffect` calls `startPolling()` but **has no cleanup return**

**Problem:** `stopPolling()` is never called. The `useEffect` in `NotificationBell` does not return a cleanup function:
```tsx
useEffect(() => {
  startPolling();
  // Missing: return () => stopPolling();
}, [startPolling]);
```

Since `startPolling` has the idempotency guard (`if (get()._pollingId) return`), the interval is created only once per store lifetime. But because this is a Zustand store (not component state), the interval persists even after `NotificationBell` unmounts -- it survives page navigation within the SPA.

**Mitigating factor:** For this app (single sidebar layout), `NotificationBell` likely never unmounts during normal usage. The interval dies on full page reload.

**Risk:** If layout changes or component conditionally renders, polling continues indefinitely in background consuming network resources.

**Recommendation:**
```tsx
useEffect(() => {
  startPolling();
  return () => { useNotificationStore.getState().stopPolling(); };
}, [startPolling]);
```

---

## 4. DOCX Parsing Malformed Files

**Status:** HANDLED
**Severity:** Low

**Evidence:**
- `src/core/use-cases/extraction/extraction-docx-xml-parser.ts:147-151` — `loadXmlParts` wraps `JSZip.loadAsync` in try-catch, returns `null` on corrupted ZIP
- `src/core/use-cases/extraction/extraction-docx-xml-parser.ts:160-162` — `parseXmlTablesFromDocx` returns `[]` when `loadXmlParts` fails
- `src/core/use-cases/extraction/extraction-docx-xml-parser.ts:55` — Nested table parser: `if (nextClose === -1) return results` -- handles malformed XML gracefully
- `src/core/use-cases/extraction/extraction-docx-xml-parser.ts:70` — `if (depth > 0) break` -- breaks on unclosed tables
- `src/core/use-cases/extract-fields-from-docx-report.ts:56-62` — Input validation: checks `fieldCatalog` array and `.docx` extension
- `src/core/use-cases/extract-fields-from-docx-report.ts:66-76` — Overall timeout wraps the entire parse pipeline
- `src/core/use-cases/extract-fields-from-docx-report.ts:77-79` — Empty document check after parsing

**Assessment:** Well-defended. Malformed DOCX flows: corrupted ZIP -> returns `null` -> empty results. Malformed XML -> regex-based parser degrades gracefully (returns partial results). Overall pipeline has timeout protection.

---

## 5. AI API Timeout/Rate Limit Handling

**Status:** PARTIAL
**Severity:** Medium

### Timeouts

- `src/services/document-extraction.service.ts:49,146-153` — `withTimeout()` wrapper at 28s per API call. Used for both OpenAI (line 189) and Gemini (line 228).
- `src/core/use-cases/extract-fields-from-docx-report.ts:64-76` — Overall pipeline timeout (default 35s).
- `src/services/ai-mapping.service.ts` — **NO timeout wrapper**. OpenAI `fetch` and Gemini `generateContent` calls have no timeout protection.

### Rate Limiting (429)

- `src/services/document-extraction.service.ts:191-193` — OpenAI: `if (!res.ok)` throws `SystemError` with `res.status`, caught by outer try-catch (line 286-296) which silently returns `[]`. 429 is handled but no retry.
- `src/services/ai-mapping.service.ts:83-85` — OpenAI: `if (!res.ok)` throws `SystemError`. Caught in line 181-191 which falls back to fuzzy matching. No retry.
- Neither service implements exponential backoff or retry on 429.

### Error Handling Quality

- `document-extraction.service.ts:286-296` — Outer catch silently swallows errors and returns `[]`. Correct for a "best-effort enhancement" step.
- `ai-mapping.service.ts:181-191` — Falls back to fuzzy matching on AI error. Good degradation.
- Gemini `JSON.parse` (document-extraction.service.ts:241) can throw on malformed AI response -- caught by outer catch.

**Recommendation:**
1. Add `withTimeout` to `ai-mapping.service.ts` calls (currently no timeout = hang indefinitely if AI provider stalls)
2. Consider adding 1 retry with backoff for 429/5xx responses in production

---

## 6. Large File Memory Safeguards

**Status:** PARTIAL
**Severity:** Medium

**Evidence:**

Upload limits exist at API boundaries:
- `src/lib/report/upload-limits.ts:29` — DOCX: 50 MB max
- `src/app/api/report/template/save-docx/route.ts:10` — Template save: 20 MB
- `src/app/api/customers/import-docx/route.ts:14` — Customer import DOCX: 10 MB
- `src/app/api/ocr/extract-document/route.ts:7` — OCR: 10 MB per file

Processing memory:
- `src/services/document-extraction.service.ts:84-89` — `truncateDocumentText` limits AI input to 40k chars (HEAD_CHARS 30k + TAIL_CHARS 10k). Good.
- `src/core/use-cases/extraction/extraction-docx-xml-parser.ts:147-148` — JSZip `loadAsync` loads entire buffer into memory. No streaming.
- `src/services/auto-tagging.service.ts` (referenced) — Also uses JSZip in-memory.

**Gap:** No server-side buffer size check in the DOCX extraction pipeline (`extract-fields-from-docx-report.ts`). It receives a `Buffer` directly -- relies entirely on upstream API routes to enforce limits. If called from a different entry point without size check, memory could spike with a 50 MB DOCX.

**Assessment:** Acceptable for current architecture. All entry points have upload limits. JSZip in-memory is standard for OOXML processing. The 50 MB DOCX limit is generous but Node.js can handle it. No streaming alternative exists for OOXML manipulation.

---

## 7. Template Placeholder Injection

**Status:** HANDLED
**Severity:** Low

**Evidence:**

### Placeholder Parsing (read-only, no execution)
- `src/lib/report/template-parser.ts:8` — `BRACKET_RE = /\[([^\]\r\n]{1,200})\]/g` — 200-char limit per placeholder, no newlines allowed. Prevents ReDoS and oversized matches.
- `src/lib/report/template-parser.ts:25-39` — `extractPlaceholdersFromXml` scans per-paragraph, preventing cross-paragraph bracket pairing
- `src/lib/report/placeholder-utils.ts` — `suggestAliasForPlaceholder` uses Levenshtein distance, pure string comparison. No code execution.

### Expression Evaluator (the main injection surface)
- `src/lib/report/field-calc-expression-evaluator.ts` — Custom recursive-descent parser. No `eval()`, no `Function()`, no `vm.runInContext`. Only supports:
  - Numbers, identifiers (Unicode letters/digits/underscore/dot)
  - Operators: `+ - * /`
  - Functions: `ROUND`, `ROUNDUP`, `ROUNDDOWN` (hardcoded whitelist at line 112-118)
  - Parentheses, commas
- Unknown identifiers resolve to `0` (line 209: `return v ?? 0`), not to arbitrary code execution
- Division by zero returns `null` (line 163)

### Path Traversal Protection
- `src/lib/report/path-validation.ts` — `validatePathUnderBase` prevents path traversal for template file operations
- `src/app/api/report/auto-tagging/apply/route.ts:31` — Used before reading template files

**Assessment:** No injection risk. The expression evaluator is a properly sandboxed arithmetic-only parser. Template values are inserted as plain text into DOCX XML (text replacement), not interpreted as code. Path validation prevents directory traversal.

---

## Summary Table

| # | Edge Case | Status | Severity | Action Needed |
|---|-----------|--------|----------|---------------|
| 1 | Zustand hydration race | HANDLED | Low | None |
| 2 | Customer store stale data | PARTIAL | Medium | Clear selectedCustomerId on delete |
| 3 | Notification polling leak | UNHANDLED | High | Add cleanup return in useEffect |
| 4 | DOCX malformed files | HANDLED | Low | None |
| 5 | AI timeout/rate limit | PARTIAL | Medium | Add timeout to ai-mapping.service; consider retry for 429 |
| 6 | Large file memory | PARTIAL | Medium | Acceptable for current arch; add buffer size guard in extraction pipeline |
| 7 | Template placeholder injection | HANDLED | Low | None |

## Priority Fixes

1. **HIGH** -- `notification-bell.tsx`: Add `useEffect` cleanup to call `stopPolling()` on unmount
2. **MEDIUM** -- `ai-mapping.service.ts`: Wrap AI calls with `withTimeout` (currently no timeout)
3. **MEDIUM** -- `customer-list-view.tsx`: Clear `selectedCustomerId` when deleting the selected customer
4. **LOW** -- Consider retry logic for AI 429 responses (not urgent -- fuzzy fallback exists)
