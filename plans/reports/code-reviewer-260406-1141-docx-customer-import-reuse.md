# Code Reuse Review: DOCX Customer Import Feature

**Date:** 2026-04-06
**Files Analyzed:**
- `src/app/api/customers/import-docx/route.ts` (NEW, 233 lines)
- `src/components/customers/customer-docx-import-modal.tsx` (NEW, 371 lines)
- `src/components/customers/customer-list-view.tsx` (MODIFIED)

## Reuse Opportunities Found

### 1. **CRITICAL: Duplicate `truncateText()` logic** ⚠️
**Issue:** Identical text truncation (head 30k + tail 10k) implemented twice.

**Files involved:**
- `src/app/api/customers/import-docx/route.ts` (line 98-101) — `truncateText()`
- `src/services/document-extraction.service.ts` (line 84-90) — `truncateDocumentText()`

**Recommended fix:**
- Remove `truncateText()` from import-docx/route.ts
- Import from document-extraction.service or export utility to `src/lib/document-truncate.ts`
- Use consistent naming: `truncateDocumentText` (already exported and tested)

**Impact:** Maintenance burden, inconsistent behavior if limits ever change.

---

### 2. **REUSE: Gemini API Extraction Pattern**
**Issue:** Reimplemented direct Gemini integration instead of using existing extraction services.

**Files involved:**
- `src/app/api/customers/import-docx/route.ts` (line 103-131) — `extractWithGemini()` (inline)
- `src/services/document-extraction.service.ts` (line 208-245) — `extractViaGemini()` (mature, with timeouts + batching)
- `src/services/ocr.service.ts` (line 74-82) — `getGeminiModel()` (shared model factory)

**Current code problems:**
- No timeout protection (document-extraction uses 28s timeout)
- No batching if prompt exceeds token limit
- Duplicates Gemini model initialization (should use `getGeminiModel()`)
- Direct GoogleGenerativeAI usage when `resolveAiProvider()` is already called

**Recommended fix:**
Create a new service function: `extractCustomerDataFromDocx()` in a new file `src/services/customer-data-extractor.service.ts` that:
- Reuses `truncateDocumentText()` for text prep
- Uses `resolveAiProvider()` to pick OpenAI vs Gemini (currently hardcoded to Gemini)
- Wraps AI call with timeout and proper error handling
- Handles merge logic for multiple files (currently in route.ts)

**Impact:** Better error resilience, provider flexibility, code reusability.

---

### 3. **MEDIUM: Drop Zone UI Pattern** ✓
**Issue:** Drag-and-drop file upload implemented inline; similar pattern exists in document-scanner.

**Files involved:**
- `src/components/customers/customer-docx-import-modal.tsx` (line 242-253) — drag zone
- `src/app/report/customers/[id]/components/document-scanner-dialog.tsx` (line 94-100) — similar pattern

**Assessment:** NOT a reuse problem. Both are appropriately scoped:
- Customer import: handles DOCX only, labeled "kéo thả DOCX"
- Document scanner: handles image/PDF, labeled by document type
- Different allowed file types + context → separate implementations acceptable

**No action needed.**

---

### 4. **LOW: Field Labels & Mapping** ⚠️
**Issue:** Hard-coded label maps for Customer, Loan, Collateral exist only in modal component.

**Current location:**
- `customer-docx-import-modal.tsx` (line 28-47) — `CUSTOMER_LABELS`, `LOAN_LABELS`, `COLLATERAL_LABELS`

**Consideration:**
These are UI-only (for display in review step). They mirror the route.ts data types (`ExtractedCustomer`, `ExtractedLoan`, `ExtractedCollateral`) but are component-specific.

**Assessment:** LOW priority. If ever needed by another component (e.g., for batch import summary), extract to `src/constants/customer-import-labels.ts`. For now, inline is acceptable.

---

### 5. **GOOD: Auth Guard Pattern** ✓
**File:** `src/app/api/customers/import-docx/route.ts` (line 179)

**Check:** Uses `requireEditorOrAdmin()` ✓ correct for customer creation endpoint.

**Verified:** Same guard used in `src/app/api/user/admin-manage/route.ts` — consistent pattern.

**No action needed.**

---

### 6. **GOOD: Error Handling & Response Format** ✓
**Files:** Both route.ts and modal.tsx follow consistent patterns:
- API always returns `{ ok: boolean, error?: string, [payload]? }`
- Modal checks `data.ok` before proceeding
- Error messages in Vietnamese with context

**No action needed.**

---

### 7. **EDGE CASE: Modal Type Definitions** ⚠️
**Issue:** Modal has loose type: `ExtractedData = Record<string, string | number>` (line 12-15).

Route.ts has strict types: `ExtractedCustomer`, `ExtractedLoan`, `ExtractedCollateral`.

**Risk:** If route.ts adds a new field type (e.g., boolean), modal won't know about it. Type sync gap.

**Recommendation:** Export types from route.ts or create shared `src/types/customer-import.ts`:
```typescript
export type ExtractedCustomer = {...}
export type ExtractedLoan = {...}
export type ExtractedCollateral = {...}
export type ExtractedData = {
  customer: Partial<ExtractedCustomer>;
  loans: Partial<ExtractedLoan>[];
  collaterals: Partial<ExtractedCollateral>[];
};
```

**Impact:** Type safety for modal review step.

---

## Summary

| Reuse Issue | Severity | Action |
|---|---|---|
| `truncateText()` duplication | HIGH | Extract to shared utility, use `truncateDocumentText` from document-extraction.service |
| Gemini extraction reimplemented | MEDIUM | Create `customer-data-extractor.service.ts` wrapping Gemini/OpenAI with timeouts |
| Field labels hard-coded | LOW | Accept for now; extract if another component needs them later |
| Type definitions loose | MEDIUM | Create shared types in `src/types/customer-import.ts` |
| Drop zone UI duplicated | — | False positive; acceptable separate implementations |
| Auth guard | — | ✓ Correct usage |

## Unresolved Questions
- Should customer import support both Gemini AND OpenAI, or only Gemini? (Currently hardcoded to Gemini; `resolveAiProvider()` accepts fallback)
- Should `FieldSection` component be extracted to `src/components/ui/editable-fields-grid.tsx` for reuse in future bulk edit features?
