---
phase: 4
title: "Shared Components Split"
status: complete
effort: 2h
---

# Phase 4: Shared Components Split

## File Ownership

- `src/components/financial-analysis/FinancialAnalysisModal.tsx`
- `src/components/invoice-tracking/disbursement-form-modal.tsx`
- `src/components/docx-template-editor-modal.tsx`
- `src/components/customers/customer-detail-view.tsx`
- `src/app/report/customers/[id]/components/collateral-form.tsx`
- `src/components/FinancialAnalysisModal.tsx` (re-export — check if just barrel)

## Files to Split

### 1. FinancialAnalysisModal.tsx — src/components/financial-analysis/ (Red Team #3: re-plan after 0C)

**⚠️ Phase 0C modifies this file** (merges khdn variant in). Split plan below is based on PRE-merge structure and MUST be re-evaluated after Phase 0C completes. Re-read the file and adjust split boundaries.

**Tentative split strategy (verify post-0C):**
- `financial-analysis-upload-step.tsx` — drag-drop upload UI + file validation (~120 lines)
- `financial-analysis-review-step.tsx` — analysis results review + apply (~150 lines)
- `financial-analysis-modal.tsx` — main shell with step state machine (~200 lines)
- Update `index.ts` barrel (named exports only)

### 2. disbursement-form-modal.tsx (471 lines)

Single component with helper functions (tempId, emptyBeneficiaryLine, calcEndDateFromTerm, etc.) + large form JSX.

**Split strategy:**
- `disbursement-form-helpers.ts` — tempId, emptyBeneficiaryLine, emptyInvoiceLine, num, fmtDmy, calcEndDateFromTerm, calcTermFromEndDate (~50 lines)
- `disbursement-beneficiary-section.tsx` — beneficiary lines table + add/remove (~120 lines)
- `disbursement-invoice-section.tsx` — invoice lines table + add/remove (~100 lines)
- `disbursement-form-modal.tsx` — main form shell (~200 lines)

### 3. docx-template-editor-modal.tsx (392 lines)

**Split strategy:**
- `docx-template-editor-toolbar.tsx` — toolbar actions (save, upload, download) (~100 lines)
- `docx-template-editor-modal.tsx` — main modal + OnlyOffice integration (~200 lines)

### 4. customer-detail-view.tsx (357 lines)

Tab-based view with corporate/individual tab configs + form + submit handler.

**Split strategy:**
- `customer-detail-tabs-config.ts` — corporateTabs, individualTabs arrays + tab type (~60 lines)
- `customer-detail-form-fields.tsx` — field rendering per tab (~100 lines)
- `customer-detail-view.tsx` — main component (~200 lines)

### 5. collateral-form.tsx (426 lines)

Large form with owner entries, amendment entries, field groups.

**Split strategy:**
- `collateral-form-owner-section.tsx` — owner table + handlers (~80 lines)
- `collateral-form-amendment-section.tsx` — amendment table + handlers (~80 lines)
- `collateral-form-field-groups.tsx` — renderField, renderGroup helpers (~80 lines)
- `collateral-form.tsx` — main form shell (~186 lines)

### 6. src/components/FinancialAnalysisModal.tsx (re-export)

Check if just a barrel re-export. If so, leave as-is (will be renamed in Phase 7).

## Import Update Checklist

- disbursement-form-modal: imported by `loans/[id]/page.tsx`, `disbursements/` pages
- docx-template-editor-modal: imported by mapping page, template page
- customer-detail-view: imported by `customers/[id]/page.tsx`
- collateral-form: imported by customer detail sections
- Keep all existing export names via barrel re-exports

## Compile Verification

```bash
npx tsc --noEmit
```

## Todo

- [x] Split FinancialAnalysisModal (534 → 3 files)
- [x] Split disbursement-form-modal (471 → 4 files)
- [x] Split docx-template-editor-modal (392 → 2 files)
- [x] Split customer-detail-view (357 → 3 files)
- [x] Split collateral-form (426 → 4 files)
- [x] Check FinancialAnalysisModal re-export (leave if barrel)
- [x] Verify compile: `npx tsc --noEmit`
