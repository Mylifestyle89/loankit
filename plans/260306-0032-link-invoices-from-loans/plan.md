# Plan: Link Invoice from Loans Module to Invoice Module

## Overview
Add ability to create/link invoices directly from the Loan detail page's disbursement table, per beneficiary line. Currently the badge shows invoice status but there's no action to add/manage invoices from there.

## Current State
- `DisbursementBeneficiary` has `invoiceStatus` ("pending"|"has_invoice") and `invoiceAmount`
- `Invoice` model links to both `Disbursement` and optionally `DisbursementBeneficiary` via `disbursementBeneficiaryId`
- Invoice CRUD exists in `src/services/invoice.service.ts` and `/api/invoices/*` routes
- Loan detail page (`src/app/report/loans/[id]/page.tsx`) shows beneficiary lines with colored status badges
- Standalone invoice overview at `src/app/report/invoices/page.tsx`

## Phases

### Phase 1: Add Invoice Action Button per Beneficiary Line
**Status:** pending | **Effort:** S | **Priority:** high

Add a clickable action on each beneficiary's status badge/row to navigate or open modal for adding invoices linked to that specific beneficiary line.

**Files:**
- `src/app/report/loans/[id]/page.tsx` — add "Bổ sung HĐ" button per beneficiary row
- `src/components/invoice-tracking/add-invoice-from-loan-modal.tsx` — NEW: modal to create invoice pre-filled with disbursement + beneficiary context

**Steps:**
1. Create `AddInvoiceFromLoanModal` with props: `disbursementId`, `beneficiaryLineId`, `beneficiaryName`, `amount`
2. Modal form: invoiceNumber, supplierName (default=beneficiaryName), amount (default=line amount), issueDate, dueDate, notes
3. POST to `/api/invoices` with `disbursementId` and `disbursementBeneficiaryId`
4. On success: update beneficiary line's `invoiceStatus`/`invoiceAmount` and refresh table
5. Add button in beneficiary row (next to badge) — icon: Plus or FileText

### Phase 2: Auto-update Beneficiary Invoice Status
**Status:** pending | **Effort:** S | **Priority:** high

When invoice is created/updated/deleted linked to a beneficiary line, auto-recalculate `invoiceStatus` and `invoiceAmount`.

**Files:**
- `src/services/invoice.service.ts` — add helper to recalc beneficiary status after CUD
- `src/app/api/invoices/route.ts` — ensure POST passes `disbursementBeneficiaryId`

**Steps:**
1. Add `recalcBeneficiaryStatus(beneficiaryLineId)` in invoice service
2. Sum all invoices for that line → update `invoiceAmount`, set `invoiceStatus` = "has_invoice" if any exist, "pending" if none
3. Call recalc after create, update, delete operations

### Phase 3: Quick Navigation Between Modules
**Status:** pending | **Effort:** XS | **Priority:** medium

Add links from loan detail to invoice overview (filtered by customer) and vice versa.

**Files:**
- `src/app/report/loans/[id]/page.tsx` — add "Xem hoa don" link
- `src/app/report/invoices/page.tsx` — add back-link to loan when viewing filtered

**Steps:**
1. Add "Quản lý hóa đơn" button in loan detail header linking to `/report/invoices?customerId={id}`
2. In invoice overview, when `customerId` filter active, show breadcrumb link back to loan

## Success Criteria
- Can add invoice from beneficiary line in loan detail
- Badge auto-updates after invoice added
- Can navigate to invoice module filtered by customer
- Existing invoice CRUD still works unchanged

## Risk
- Low: Changes are additive, no schema migration needed
- `DisbursementBeneficiary.invoiceStatus/Amount` already exists — just need to keep it in sync
