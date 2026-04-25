# Code Review: Loan Plan + Customer Changes

## Scope
- 24 files (8 changed, 16 new)
- Focus: hacky patterns, copy-paste, type safety, leaky abstractions

## Findings

### HIGH - Copy-paste / DRY violations

1. **Zod schemas duplicated across route files**
   - `src/app/api/loan-plans/route.ts:10-23` and `src/app/api/loan-plans/[id]/route.ts:10-23` define identical `costItemSchema` + `revenueItemSchema`. Extract to shared file.

2. **`inputCls` string duplicated 4 times**
   - `src/app/report/customers/[id]/page.tsx:44`
   - `src/app/report/customers/new/page.tsx:10`
   - `src/app/report/customers/[id]/loan-plans/new/page.tsx:25`
   - `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx:13`
   - Same long Tailwind class string. Extract to shared constant or component.

3. **Customer new/edit form markup nearly identical**
   - `src/app/report/customers/new/page.tsx:109-165` vs `src/app/report/customers/[id]/page.tsx:218-273`
   - Corporate/individual field blocks are copy-pasted. Extract a `CustomerFormFields` component.

4. **`fmtVND` helper duplicated**
   - `src/app/report/customers/[id]/loan-plans/page.tsx:31-33` and `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx:15`

### HIGH - Type safety issues

5. **Unsafe `as unknown as` casts in calculator**
   - `src/lib/loan-plan/loan-plan-calculator.ts:56-66` -- `calcCategoryRevenue` casts `Record<string,number>` to specific revenue types via `as unknown as`. No runtime validation; missing keys silently produce `NaN`. Use zod or manual field checks.

6. **`Record<string, unknown>` cast for typed object mutation**
   - `src/app/report/customers/[id]/loan-plans/[planId]/cost-items-table.tsx:21-24` and `page.tsx:89` -- casting `item as Record<string,unknown>` to set numeric fields. Use explicit field assignment instead.

7. **`eslint-disable @typescript-eslint/no-explicit-any` + `any[]` in FullCustomer**
   - `src/app/report/customers/[id]/page.tsx:13,28-29` -- `loans: any[]`, `mapping_instances: any[]`. Define at least minimal types.

8. **Untyped `data` from fetch in loan-plans pages**
   - `src/app/report/customers/[id]/loan-plans/page.tsx:43-44` -- `const data = await res.json()` without type assertion. Same at `new/page.tsx:62`, `[planId]/page.tsx:36-37`.

### MEDIUM - Redundant state / derived values stored as state

9. **`financials` state is fully derived from costItems + revenueItems + loanAmount + interestRate + loanMonths**
   - `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx:30,55-65` -- recalculated in useEffect and stored in state. Use `useMemo` instead of `useEffect` + `setState` to avoid extra render cycle.

10. **`totalAmount` in CostItemsTable is derived but computed inline (fine), however `amount` on each CostItem is derived from `qty * unitPrice`**
    - `cost-items-table.tsx:26` and `loan-plan-types.ts:8` -- `amount` field is always `qty * unitPrice`. This is redundant state that must be kept in sync. Consider computing it on render or in the service only.

### MEDIUM - Stringly-typed code

11. **`loan_method` and `customer_type` are plain strings in UI and service, but have enum types defined**
    - `src/lib/loan-plan/loan-plan-types.ts:80` defines `LoanMethod` type, but `loan-plan.service.ts:29` types it as `string`. Same for `customer_type` in `customer.service.ts:41`.

12. **`FIELD_TO_COLUMN` / `COLUMN_TO_FIELD` are manually maintained inverse maps**
    - `src/services/customer.service.ts:6-36` -- one should be derived from the other to prevent drift (just like `FRAMEWORK_TO_BK_LABEL` in bk-mapping.ts).

### MEDIUM - Missing error handling

13. **Fetch calls without try-catch in client pages**
    - `src/app/report/customers/[id]/loan-plans/page.tsx:41-45` -- `load()` has no try-catch; network error crashes.
    - `src/app/report/customers/[id]/loan-plans/new/page.tsx:38-40` -- template fetch in useEffect, no error handling.
    - `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx:34-48` -- `loadPlan` has no try-catch.
    - `src/app/report/customers/[id]/loan-plans/page.tsx:52-53` -- `handleDelete` ignores fetch failure.

14. **`JSON.parse` on DB json fields without try-catch**
    - `src/services/loan-plan.service.ts:58,95-97` -- if DB contains malformed JSON, entire request crashes.
    - `src/app/report/customers/[id]/loan-plans/page.tsx:84` -- `JSON.parse(p.financials_json || "{}")` in render path.

### MEDIUM - Security

15. **Path traversal: double-resolve weakens check**
    - `src/app/api/report/templates/open/route.ts:24` -- `path.resolve(process.cwd(), relPath)` where `relPath` comes from user input. On Windows, `path.resolve` with absolute path input (e.g., `C:\...`) ignores cwd. The `startsWith` check on line 25 is correct but would fail if `REPORT_ASSETS_DIR` ends differently on case-insensitive Windows. Consider normalizing both paths.

16. **APC import has no auth guard**
    - `src/app/api/report/import/apc/route.ts` -- no `requireAdmin()` call, unlike other mutation endpoints.

### LOW - Unused / dead code

17. **`saveTimer` ref never used**
    - `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx:31` -- `saveTimer` declared but never assigned or read. Leftover from planned auto-save.

18. **`dirty` ref never read**
    - `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx:54` -- `dirty.current = true` but never consumed.

19. **Unused imports in bk-importer.ts**
    - `src/lib/import/bk-importer.ts:1-2` -- `FieldCatalogItem` is used only in `generateFieldCatalogFromBk`. `translateFieldLabelVi`, `translateGroupVi` imported but verify they're actually used (they are, but `isEmptyValue` from bk-normalizer is imported and never used).

### LOW - `setTimeout(0)` pattern

20. **`setTimeout(0)` for initial load persists**
    - `src/app/report/customers/[id]/page.tsx:110-113` and `src/app/report/customers/page.tsx:69-72` -- purpose still unclear, adds complexity for no visible benefit.

## Positive Observations
- Clean separation: types, calculator, service, API route, UI
- Consistent error envelope `{ ok, error }` across all API routes
- Zod validation on write endpoints
- Path traversal protection on template download endpoint
- Good use of `useCallback` for fetch functions to avoid stale closures

## Unresolved Questions
- Is `amount` on `CostItem`/`RevenueItem` intended to support manual override (not derived), or should it always be `qty * unitPrice`?
- What is the purpose of `setTimeout(0)` in customer pages? If for avoiding SSR hydration mismatch, a comment would help.
