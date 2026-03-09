# Code Review: Invoice Tracking Files

## Scope
- 7 files reviewed, ~550 LOC total
- Focus: redundancy, parameter sprawl, copy-paste, leaky abstractions, stringly-typed code

## Findings

### 1. Copy-paste: Modal boilerplate duplicated (Medium)

`disbursement-form-modal.tsx` and `invoice-form-modal.tsx` both manually implement:
- Escape key listener via `useEffect` + `window.addEventListener("keydown", ...)`
- Backdrop click via `ref` + click comparison
- Identical header layout (title + X button)
- Identical footer layout (cancel + submit buttons)
- Same `inputCls` and `labelCls` string constants (also duplicated in `loans/new/page.tsx`)

**The project already has `BaseModal` at `src/components/ui/BaseModal.tsx`** which handles Escape, backdrop, title, and footer. These modals should wrap `BaseModal` instead of re-implementing modal chrome.

**Impact:** 3 files duplicate ~30 lines of identical modal infrastructure each.

### 2. Stringly-typed: Disbursement status uses raw strings (Medium)

Status values `"active"`, `"completed"`, `"cancelled"` appear as:
- Raw strings in `disbursement.service.ts` line 66
- Raw `<option value="...">` in `loans/[id]/page.tsx` lines 181-183
- Zod enum in `api/disbursements/[id]/route.ts` line 13
- Zod enum in `api/loans/[id]/route.ts` line 17

No shared constant/enum. If a new status is added (e.g. `"pending"`), every file must be updated independently.

**Fix:** Extract `DISBURSEMENT_STATUSES = ["active", "completed", "cancelled"] as const` to a shared constants file. Derive Zod schema and TS type from it.

### 3. Redundant fmtNumber vs fmtDisplay (Low)

`format-helpers.ts` exports two number formatters:
- `fmtNumber(value: string)` -- strips non-digits, formats via `Number().toLocaleString("vi-VN")`
- `fmtDisplay(n: number)` -- formats via `Intl.NumberFormat("vi-VN").format(n)`

These do the same thing with different input types. `fmtNumber` is input-field-specific (takes raw string), `fmtDisplay` is for read-only contexts (takes number). The naming doesn't make the distinction clear.

**Suggestion:** Rename to `fmtInputNumber` / `fmtDisplayNumber` for clarity, or unify into one function with overloads.

### 4. Missing date validation in service layer (High)

`disbursementService.create()` does `new Date(input.disbursementDate)` (line 110) without validating the string is a valid date. If an invalid string is passed (bypassing the API Zod schema, e.g. from internal callers), `new Date("garbage")` produces `Invalid Date` and Prisma will throw an opaque error.

Same issue in `update()` line 122.

**Fix:** Add `isNaN(new Date(input.disbursementDate).getTime())` check before Prisma call, or parse with Zod `.datetime()` at the type level.

### 5. getSummaryByLoan makes 2 sequential DB queries (Low)

`getSummaryByLoan` runs `prisma.disbursement.aggregate()` then `prisma.disbursement.count()` sequentially (lines 60-67). These are independent and could use `Promise.all`.

### 6. Search debouncing missing in page (Medium)

`loans/[id]/page.tsx` triggers `loadDisbursements` on every keystroke in the search input (line 170 -> state change -> useEffect). No debounce means a DB query per character typed.

**Fix:** Add a debounce (300-500ms) on the `search` state before it triggers the fetch effect.

### 7. Page reset race condition (Low)

`loans/[id]/page.tsx` lines 94-97: The filter-change effect sets `page = 1`, but `loadDisbursements` depends on `[page, statusFilter, search]`. When `search` changes, both effects fire -- one to reset page, one to fetch. The fetch may fire with the old page value before the page-reset effect runs, causing a wasted request.

**Fix:** Reset page inside `loadDisbursements` when filters change, or use a single reducer for filter state.

### 8. Error state not cleared on successful loan load (Low)

`loans/[id]/page.tsx` line 70: On success, `setLoan(data.loan)` but `setError("")` is never called. If loan initially fails then succeeds on retry, old error persists.

## Positive Observations

- Clean separation: service layer, API route, UI component each have clear responsibilities
- `format-helpers.ts` is well-organized and focused
- `PaginationControls` is a clean, reusable component
- Proper use of `Promise.all` in the API route for parallel fetching
- Zod validation at API boundary is good practice
- Page size clamping in service (`Math.min(100, ...)`) prevents abuse

## Recommended Actions (Priority Order)

1. **Extract disbursement status constants** to shared file, derive Zod + TS type
2. **Add debounce** to search input in loan detail page
3. **Refactor modals** to use existing `BaseModal` component, extract shared `inputCls`/`labelCls` to a shared style constants file
4. **Add date validation** in service layer `create`/`update` methods
5. **Use `Promise.all`** in `getSummaryByLoan` for the two independent queries
6. **Fix error state clearing** in loan load success path
