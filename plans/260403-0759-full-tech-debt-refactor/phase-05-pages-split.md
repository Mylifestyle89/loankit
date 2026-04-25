---
phase: 5
title: "Pages Split"
status: complete
effort: 2h
---

# Phase 5: Pages Split

## File Ownership

- `src/app/report/invoices/page.tsx` (455 lines)
- `src/app/report/loans/page.tsx` (359 lines)
- `src/app/report/loans/[id]/page.tsx` (418 lines)
- `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx` (409 lines)
- `src/app/report/khdn/mapping/page.tsx` (371 lines)

NOTE: Page files must keep `export default` in page.tsx (Next.js App Router convention). Extract sub-components into sibling `components/` dirs.

## Files to Split

### 1. invoices/page.tsx (455 lines)

Types (SummaryItem, Invoice, GroupedDisbursement) + state + fetch + filter + grouped rendering.

**Split strategy:**
- `invoices/components/invoice-overview-types.ts` — SummaryItem, Invoice, GroupedDisbursement types (~50 lines)
- `invoices/components/invoice-filters-bar.tsx` — status/customer filters + group-by toggle (~80 lines)
- `invoices/components/invoice-grouped-view.tsx` — GroupedDisbursement rendering + collapse toggle (~100 lines)
- `invoices/components/invoice-bulk-actions.tsx` — bulk select + mark paid actions (~50 lines)
- `invoices/page.tsx` — main page with state + data fetch + compose above (~175 lines)

### 2. loans/page.tsx (359 lines)

Constants (LOAN_METHOD_LABELS, STATUS_OPTIONS, CUSTOMER_TYPE_OPTIONS) + filters + table.

**Split strategy:**
- `loans/components/loan-list-constants.ts` — labels, status/type option arrays (~30 lines)
- `loans/components/loan-list-filters.tsx` — filter bar component (~80 lines)
- `loans/components/loan-list-table.tsx` — table rendering (~80 lines)
- `loans/page.tsx` — main page (~170 lines)

### 3. loans/[id]/page.tsx (418 lines)

Loan detail with disbursement list, tabs, modals.

**Split strategy:**
- `loans/[id]/components/loan-detail-header.tsx` — loan info header + status badge (~80 lines)
- `loans/[id]/components/loan-disbursement-table.tsx` — disbursement list table (~100 lines)
- `loans/[id]/components/loan-detail-tabs.tsx` — tab switching + tab content (~80 lines)
- `loans/[id]/page.tsx` — main page with data fetch (~160 lines)

### 4. loan-plans/[planId]/page.tsx (409 lines)

Loan plan editor with form fields.

**Split strategy:**
- `loan-plans/[planId]/components/loan-plan-form-sections.tsx` — form field groups (~120 lines)
- `loan-plans/[planId]/components/loan-plan-actions.tsx` — save/submit/generate actions (~80 lines)
- `loan-plans/[planId]/page.tsx` — main page (~200 lines)

### 5. khdn/mapping/page.tsx (371 lines)

MappingPageContent (365 lines of JSX composition) + MappingPage wrapper.

**Split strategy:**
- `khdn/mapping/components/mapping-page-header-section.tsx` — header + toolbar section (~80 lines)
- `khdn/mapping/components/mapping-page-main-content.tsx` — main canvas/sidebar/visual section (~100 lines)
- `khdn/mapping/page.tsx` — MappingPageContent simplified + MappingPage wrapper (~190 lines)

**⚠️ OWNERSHIP BOUNDARY (Red Team #6):** mapping/components/ is owned by Phase 1 for EXISTING files. Phase 5 only CREATES NEW files with `mapping-page-*` prefix. Phase 5 MUST NOT run parallel with Phase 1 on this directory — run Phase 1 first for mapping/components/, or ensure file naming never overlaps.

## Import Update Checklist

- Pages are route entry points — nothing imports them
- New sub-components are only imported by their parent page.tsx
- No barrel exports needed

## Compile Verification

```bash
npx tsc --noEmit
```

## Todo

- [x] Split invoices/page.tsx (455 → 5 files)
- [x] Split loans/page.tsx (359 → 4 files)
- [x] Split loans/[id]/page.tsx (418 → 4 files)
- [x] Split loan-plans/[planId]/page.tsx (409 → 3 files)
- [x] Split khdn/mapping/page.tsx (371 → 3 files)
- [x] Verify compile: `npx tsc --noEmit`
