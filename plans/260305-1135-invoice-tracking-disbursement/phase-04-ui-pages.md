---
phase: 4
title: "UI Pages (Loan + Disbursement + Invoice)"
status: complete
effort: 5h
depends_on: [2]
completed: 2026-03-05
---

# Phase 4: UI Pages

## Context Links

- [Customer list page pattern](../../src/app/report/customers/page.tsx)
- [Customer detail page](../../src/app/report/customers/[id]/page.tsx)
- [Report layout (sidebar)](../../src/app/report/layout.tsx)
- [BaseModal](../../src/components/ui/BaseModal.tsx)
- [i18n translations](../../src/lib/i18n/translations.ts)
- [Language provider](../../src/components/language-provider.tsx)

## Overview

Create loan management, disbursement list, detail (with invoice sub-list + surplus/deficit), invoice overview page. Add sidebar nav links. Add i18n keys for vi/en. Hierarchy: Customer → Loan → Disbursement → Invoice.

## Key Insights

- Existing UI pattern: `"use client"`, `useState`/`useCallback`/`useEffect`, native `fetch` with typed cast
- Dark mode: `bg-white dark:bg-[#141414]/90`, borders `border-coral-tree-200 dark:border-white/[0.08]`
- Tables: `<table>` with `border-b`, hover rows, consistent padding `px-4 py-2`
- Status badges: colored pills (green=paid, yellow=pending, red=overdue)
- Sidebar links array in `layout.tsx` -- add 2 new entries
- Forms: `useState` per field, submit via `fetch` POST
- Keep each page file under 200 lines -- extract shared components

## Requirements

### Functional
- `/report/loans` -- list all loans (filterable by customer)
- `/report/loans/new` -- create loan form (select customer, contract number, amount, dates, purpose)
- `/report/loans/[id]` -- loan detail: loan info + disbursement list + add disbursement
- `/report/disbursements/[id]` -- disbursement detail: info + invoice list + surplus/deficit banner + add invoice form
- `/report/invoices` -- all invoices with filters (status, customer, loan)
- Duplicate warning shown as yellow banner when creating invoice (checks invoiceNumber + supplierName)

### Non-functional
- Responsive (matches existing pages)
- i18n keys for all user-visible strings
- Dark mode support on all elements

## Architecture

### Page Structure

```
/report/loans/
  page.tsx              -- list + customer filter
  new/page.tsx          -- create form
  [id]/page.tsx         -- detail + disbursement list

/report/disbursements/
  [id]/page.tsx         -- detail + invoice list + surplus/deficit

/report/invoices/
  page.tsx              -- all invoices overview

Components (shared, under src/components/invoice-tracking/):
  loan-status-badge.tsx
  disbursement-status-badge.tsx
  invoice-status-badge.tsx
  surplus-deficit-banner.tsx
  invoice-form-modal.tsx
  invoice-table.tsx
  disbursement-form-modal.tsx
```

### Customer Filter

On disbursements list page, fetch customers for dropdown. On change, re-fetch disbursements with `?customerId=X`.

### Surplus/Deficit Banner

Displayed at top of disbursement detail page:
- Green: "Can doi" (balanced)
- Blue: "Thua X VND" (surplus)
- Red: "Thieu X VND" (deficit)

## Related Code Files

### Create
- `src/app/report/loans/page.tsx`
- `src/app/report/loans/new/page.tsx`
- `src/app/report/loans/[id]/page.tsx`
- `src/app/report/disbursements/[id]/page.tsx`
- `src/app/report/invoices/page.tsx`
- `src/components/invoice-tracking/loan-status-badge.tsx`
- `src/components/invoice-tracking/disbursement-status-badge.tsx`
- `src/components/invoice-tracking/invoice-status-badge.tsx`
- `src/components/invoice-tracking/surplus-deficit-banner.tsx`
- `src/components/invoice-tracking/invoice-form-modal.tsx`
- `src/components/invoice-tracking/invoice-table.tsx`
- `src/components/invoice-tracking/disbursement-form-modal.tsx`

### Modify
- `src/app/report/layout.tsx` -- add 2 nav links (Loans, Invoices)
- `src/lib/i18n/translations.ts` -- add vi/en keys

## Implementation Steps

### 1. Add nav links to sidebar

In `src/app/report/layout.tsx`, update `links` array:

```typescript
import { Banknote, Receipt, FileText } from "lucide-react";

// Add after existing links:
{ href: "/report/loans", label: t("nav.loans"), icon: FileText },
{ href: "/report/invoices", label: t("nav.invoices"), icon: Receipt },
```

### 2. Add i18n keys to `src/lib/i18n/translations.ts`

```typescript
// vi:
"nav.loans": "Khoan vay",
"nav.invoices": "Hoa don",
"loans.title": "Quan ly khoan vay",
"loans.desc": "Theo doi cac khoan vay va giai ngan",
"loans.add": "Them khoan vay",
"loans.contractNumber": "So hop dong",
"loans.loanAmount": "So tien vay",
"loans.interestRate": "Lai suat (%)",
"loans.startDate": "Ngay bat dau",
"loans.endDate": "Ngay ket thuc",
"loans.purpose": "Muc dich vay",
"loans.disbursementCount": "So dot giai ngan",
"loans.noData": "Chua co khoan vay nao",
"loans.loading": "Dang tai...",
"loans.deleteConfirm": "Ban co chac muon xoa khoan vay nay?",
"disbursements.title": "Quan ly giai ngan",
"disbursements.desc": "Theo doi cac khoan giai ngan va hoa don lien quan",
"disbursements.add": "Them giai ngan",
"disbursements.customer": "Khach hang",
"disbursements.amount": "So tien giai ngan",
"disbursements.date": "Ngay giai ngan",
"disbursements.description": "Mo ta",
"disbursements.status": "Trang thai",
"disbursements.status.active": "Dang hoat dong",
"disbursements.status.completed": "Hoan thanh",
"disbursements.status.cancelled": "Da huy",
"disbursements.invoiceCount": "So hoa don",
"disbursements.surplus": "Thua",
"disbursements.deficit": "Thieu",
"disbursements.balanced": "Can doi",
"disbursements.noData": "Chua co khoan giai ngan nao",
"disbursements.loading": "Dang tai...",
"disbursements.deleteConfirm": "Ban co chac muon xoa khoan giai ngan nay?",
"invoices.title": "Tong quan hoa don",
"invoices.desc": "Tat ca hoa don tu moi khoan giai ngan",
"invoices.number": "So hoa don",
"invoices.supplier": "Nha cung cap",
"invoices.amount": "So tien",
"invoices.issueDate": "Ngay phat hanh",
"invoices.dueDate": "Ngay dao han",
"invoices.customDeadline": "Deadline bo sung",
"invoices.status": "Trang thai",
"invoices.status.pending": "Dang no",
"invoices.status.paid": "Da thanh toan",
"invoices.status.overdue": "Qua han",
"invoices.add": "Them hoa don",
"invoices.noData": "Chua co hoa don nao",
"invoices.duplicateWarning": "Canh bao: So hoa don nay da ton tai!",
"invoices.notes": "Ghi chu",

// en: (same keys, English values)
"nav.loans": "Loans",
"nav.invoices": "Invoices",
"loans.title": "Loan Management",
"loans.desc": "Track loans and disbursements",
"disbursements.title": "Disbursement Management",
"disbursements.desc": "Track disbursements and related invoices",
// ... (mirror all vi keys with English values)
```

### 3. Create status badge components

`disbursement-status-badge.tsx`:
```typescript
"use client";
const COLORS = {
  active: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  cancelled: "bg-zinc-100 text-zinc-500 dark:bg-zinc-500/20 dark:text-zinc-400",
};
export function DisbursementStatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[status] ?? COLORS.active}`}>{status}</span>;
}
```

`invoice-status-badge.tsx`:
```typescript
const COLORS = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
  paid: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
};
```

### 4. Create surplus/deficit banner

`surplus-deficit-banner.tsx`:
```typescript
type Props = { disbursementAmount: number; totalInvoice: number; diff: number; label: "surplus" | "deficit" | "balanced" };
// Green for balanced, blue for surplus, red for deficit
// Shows: "Giai ngan: 500,000,000 | Tong HD: 480,000,000 | Thieu: 20,000,000"
```

### 5. Create loan list page

`/report/loans/page.tsx`:
- Fetch customers for filter dropdown
- Fetch loans (optionally filtered by customerId via `GET /api/loans?customerId=X`)
- Table: customer name, contract number, loan amount (formatted), dates, status badge, disbursement count, actions (view/delete)
- Link to `/report/loans/new` for create
- Pattern follows customers/page.tsx exactly

### 6. Create loan create page

`/report/loans/new/page.tsx`:
- Customer dropdown (fetched from `/api/customers`)
- Contract number, loan amount, interest rate, start date, end date, purpose
- Submit POST to `/api/loans`
- Redirect to detail page on success

### 7. Create loan detail page

`/report/loans/[id]/page.tsx`:
- Fetch loan with disbursements from `GET /api/loans/[id]`
- Show loan info card at top
- Disbursement list table: amount, date, status, invoice count, surplus/deficit summary
- "Add Disbursement" button opens modal (disbursement-form-modal.tsx)
- Click disbursement row → navigate to `/report/disbursements/[id]`

### 8. Create disbursement detail page

`/report/disbursements/[id]/page.tsx`:
- Fetch disbursement with invoices from `GET /api/disbursements/[id]`
- Fetch surplus/deficit data
- Show surplus/deficit banner at top
- Invoice table (reusable component)
- "Add Invoice" button opens modal
- Invoice form modal: number, supplier, amount, issueDate, dueDate, customDeadline (optional), notes
- On submit, show duplicateWarning as yellow banner if returned (checks invoiceNumber + supplierName)

### 9. Create invoice table component

`invoice-table.tsx`:
- Reused in disbursement detail and invoices overview
- Columns: number, supplier, amount, issueDate, dueDate, status badge, actions
- Highlight rows where dueDate is within 7 days (yellow bg)
- Click row to mark as paid (PATCH status)

### 10. Create invoices overview page

`/report/invoices/page.tsx`:
- Fetch from `GET /api/invoices/summary` for customer-level aggregation cards
- Filter by status (pending/paid/overdue) and customer
- Fetch all invoices across disbursements
- Uses shared invoice-table component
- Summary cards at top: total pending, total overdue, total amount

### 11. Create invoice form modal

`invoice-form-modal.tsx`:
- Uses BaseModal component
- Fields: invoiceNumber, supplierName, amount, issueDate, dueDate, customDeadline?, notes?
- On submit: POST to `/api/disbursements/[id]/invoices`
- If response includes `duplicateWarning`, show yellow alert
- Close modal on success, refresh invoice list

## Todo List

- [x] Add nav links to layout sidebar (Loans, Invoices)
- [x] Add all i18n keys (vi + en) — loans, disbursements, invoices
- [x] Create shared components in `src/components/invoice-tracking/`
- [x] Create `/report/loans/page.tsx` (list)
- [x] Create `/report/loans/new/page.tsx` (create form)
- [x] Create `/report/loans/[id]/page.tsx` (detail + disbursement list)
- [x] Create `/report/disbursements/[id]/page.tsx` (detail + invoice list)
- [x] Create `/report/invoices/page.tsx` (overview + filters)
- [x] Verify dark mode on all new pages
- [x] Verify i18n switch works for all keys
- [x] Test duplicate warning display (invoiceNumber + supplierName)

## Success Criteria

- [x] All pages render without errors
- [x] Sidebar shows disbursement and invoice links
- [x] CRUD operations work end-to-end
- [x] Surplus/deficit displays correctly
- [x] Duplicate warning appears on matching invoice number
- [x] Dark mode works on all new UI
- [x] Language toggle switches all new strings

## Implementation Summary

**5 Pages Created:**
- `/report/loans/page.tsx` - List all loans with customer filter
- `/report/loans/new/page.tsx` - Create new loan form
- `/report/loans/[id]/page.tsx` - Loan detail + disbursement list + add disbursement modal
- `/report/disbursements/[id]/page.tsx` - Disbursement detail + invoice list + surplus/deficit banner + add invoice modal
- `/report/invoices/page.tsx` - All invoices overview with status + customer filters (refactored post-review for C1)

**7 Shared Components Created:**
- `loan-status-badge.tsx` - Status indicator (active|completed|cancelled)
- `disbursement-status-badge.tsx` - Disbursement status badge
- `invoice-status-badge.tsx` - Invoice status badge (pending|paid|overdue)
- `surplus-deficit-banner.tsx` - Green/blue/red banner showing balance, surplus, or deficit
- `invoice-form-modal.tsx` - Modal form for creating invoices with duplicate warning
- `invoice-table.tsx` - Reusable table for displaying invoices
- `disbursement-form-modal.tsx` - Modal form for creating disbursements

**Layout & i18n:**
- Added 2 nav links to sidebar: Loans, Invoices
- Added 50+ i18n keys (vi + en) for all UI text
- All components support dark mode with proper Tailwind classes

**Post-Review Fix (C1):**
- Refactored invoices overview page to use single `GET /api/invoices` call instead of sequential waterfall
- Eliminated 60+ N+1 requests per page load

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Page files exceed 200 lines | High | Extract table, form, banner into components |
| Number formatting locale issues | Medium | Use `Intl.NumberFormat("vi-VN")` consistently |
| Date parsing timezone issues | Medium | Store as ISO strings, display with `toLocaleDateString("vi-VN")` |

## Security Considerations

- All user input validated on server via Zod
- No `dangerouslySetInnerHTML` usage
- Confirm dialog before delete operations

## Next Steps

- Phase 5: Notification bell in layout, notification center dropdown
