# Frontend Components & Pages Review

**Date:** 2026-03-14 | **Branch:** KHCN-implement | **Scope:** ~100 frontend files across `src/app/report/`, `src/components/`, mapping stores/hooks

## Critical Issues (must fix)

1. **Fetch without try-catch in customer edit page** (`src/app/report/customers/[id]/page.tsx:100`)
   - `loadCustomer()` calls `fetch` + `.json()` with no try-catch. Network error = unhandled promise rejection, blank page.
   - Same pattern in `src/app/report/customers/new/page.tsx:41` (`handleSubmit`).
   - Fix: wrap in try-catch, set error state on failure.

2. **No Escape/close handling on BaseModal** (`src/components/ui/BaseModal.tsx`)
   - BaseModal lacks keyboard listener for Escape key. Also no focus trap.
   - Backdrop click-to-close is intentionally disabled (comment says "prevent data loss"), but no X button or Escape handler built in -- user can get trapped.
   - Fix: add `useEffect` for Escape keydown, consider optional `onClose` on backdrop, add focus trap.

3. **dangerouslySetInnerHTML in layout** (`src/app/layout.tsx:36`)
   - Used for theme flash prevention. Content is a hardcoded string (no user input), so XSS risk is minimal. Acceptable but should be documented as intentional.

## Important Issues (should fix)

4. **DRY violation: customer new/edit form duplication**
   - `customers/new/page.tsx` and `customers/[id]/page.tsx` share ~80% identical form markup (same fields, same `inputCls`, same submit logic pattern).
   - Extract shared `CustomerForm` component.

5. **Modal a11y gap in invoice-tracking modals**
   - `loan-edit-modal.tsx`, `beneficiary-modal.tsx`, `disbursement-form-modal.tsx` use raw `div` with manual `ref` for backdrop click -- missing `role="dialog"`, `aria-modal="true"`, focus trap.
   - Only `disbursement-report-modal.tsx` and `add-invoice-from-loan-modal.tsx` use BaseModal (2/7 modals).
   - Fix: migrate all modals to BaseModal (after adding Escape support to it).

6. **`inputCls` defined in 4+ places**
   - Duplicated in: `customers/[id]/page.tsx`, `customers/new/page.tsx`, `loan-edit-modal.tsx`, `loans/new/page.tsx`, `shared-form-styles.ts`.
   - `shared-form-styles.ts` exists but only some files use it.
   - Fix: consolidate all to use `shared-form-styles.ts`.

7. **`setTimeout(0)` for initial data load** (customers/page, customers/[id]/page, template/page, build-export-tab)
   - Purpose unclear. Possibly to avoid SSR hydration mismatch, but `"use client"` pages shouldn't need this.
   - Risk: adds unnecessary async delay, makes data load timing unpredictable.
   - Fix: remove `setTimeout(0)` wrappers, call fetch directly in useEffect.

8. **`eslint-disable @typescript-eslint/no-explicit-any`** in customer edit page
   - `FullCustomer` type uses `any[]` for loans and mapping_instances (line 39-40).
   - `(c as any).cccd_old` cast on line 120 -- indicates schema drift.
   - Fix: define proper types for nested objects.

9. **OCR store >250 lines** (`src/app/report/mapping/stores/use-ocr-store.ts`: 255 lines)
   - Exceeds 200-line limit. Actions (accept/decline/bulk) could be extracted to a separate file.

## Minor Issues (nice to fix)

10. **Silently swallowed errors** in multiple components
    - `beneficiary-modal.tsx:54`, `disbursement-form-modal.tsx:96,111` -- `catch { /* ignore */ }` with no user feedback.
    - `customer-summary-cards.tsx:72` -- silent catch on summary load failure.

11. **No loading skeleton for customer sub-sections**
    - Tab content (collateral, co-borrower, credit-info, related-person) each fetch independently but parent shows no loading indicator for tab switches.

12. **Hardcoded Vietnamese strings** in several places instead of using `t()` translations
    - Tab labels in `customers/[id]/page.tsx:58-64` ("Noi cho vay", "Nguoi vay", etc.)
    - Subtab labels in `loan-edit-modal.tsx:135` ("Thong tin co ban", "Dieu kien cho vay", etc.)
    - Fix: move to translation keys.

13. **`loan-edit-modal.tsx` at 223 lines** -- slightly over 200-line limit but manageable since subtab content is extracted.

14. **Mapping data store persists `fieldCatalog` and `autoValues` to localStorage**
    - Could become large for complex templates. No size guard or eviction strategy.

## Positive Patterns

- **Good store architecture**: Zustand stores are well-typed, use `partialize` for selective persistence, handle hydration properly with `_hasHydrated`.
- **OCR store's lazy import** pattern avoids circular dependencies elegantly.
- **Batch update** via `setTemplateData` prevents triple re-renders.
- **Consistent UI system**: gradient buttons, rounded cards, dark mode support throughout.
- **Debounced search** in loan detail page with proper cleanup.
- **`shared-form-styles.ts`** exists as a step toward DRY (just needs wider adoption).
- **Proper error display** in most forms with user-visible error messages.

## Summary Stats

| Metric | Value |
|--------|-------|
| Files reviewed | ~50 deeply, ~50 scanned |
| Files with fetch (report pages) | 32 |
| Files missing try-catch on fetch | 2 (customer new + edit) |
| Modals not using BaseModal | 5/7 invoice-tracking modals |
| `inputCls` duplications | 4 files (should be 1) |
| `as any` / eslint-disable | 7 occurrences across 3 files |
| Files >200 lines | ~3 (use-ocr-store, loan-edit-modal, customer-[id]-page) |
| `setTimeout(0)` data load pattern | 4 pages |
| Hardcoded Vietnamese (not i18n) | ~15 strings across 3 files |
