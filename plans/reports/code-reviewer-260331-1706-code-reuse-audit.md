# Code Reuse Audit — 2026-03-31

## Scope
- Files: 17 changed files (see task list)
- Focus: DRY violations, existing utilities that could replace new/inline code

## Findings

### 1. [MEDIUM] Duplicated `extKeys` array in `loan-plan.service.ts`

**File:** `src/services/loan-plan.service.ts` lines 92-96 vs 130-136

The same 14-element extended key list is defined twice — once in `createPlanFromTemplate()` (as `extKeys`) and again in `updatePlan()` (as `extendedKeys`). Identical content, different variable names.

**Fix:** Extract to a module-level constant:
```ts
const TRUNG_DAI_EXT_KEYS = [
  "depreciation_years", "asset_unit_price", "land_area_sau",
  "preferential_rate", "term_months", ...
] as const;
```

---

### 2. [MEDIUM] Duplicated GN/HDTD disbursement field mapping across two services

**Files:**
- `src/services/disbursement-report.service.ts` (lines 127-142) — inline in `buildReportData()`
- `src/services/khcn-builder-loan-disbursement.ts` (lines 117-147) — in `buildDisbursementExtendedData()`

Both files independently map the same disbursement fields to the same template placeholders:
- `GN.Tài liệu chứng minh`, `GN.Thời hạn cho vay`, `GN.Hạn trả cuối cùng`, `GN.Định kỳ trả gốc`, `GN.Định kỳ trả lãi`, `GN.Tiền mặt`, `GN.Số tiền gốc nhận nợ`
- `HĐTD.Hạn trả cuối`, `HĐTD.Định kỳ trả lãi`

These services evolved independently (KHDN disbursement vs KHCN disbursement), so this is expected divergence — but the field assignments are now near-identical.

**Fix:** Extract shared GN field mapping into a helper in `khcn-builder-loan-disbursement.ts` (which already exports `buildDisbursementExtendedData`), then call it from `disbursement-report.service.ts` instead of inlining.

**Caveat:** `disbursement-report.service.ts` uses raw values (e.g., `d.loanTerm ?? ""`) while `khcn-builder-loan-disbursement.ts` uses `fmtN()` for some numeric fields. The merge needs care around formatting differences. If formatting logic differs substantially, keep separate — shared but subtly different helpers are worse than duplication.

---

### 3. [LOW] Duplicate invoice check has 3 implementations

**Files:**
- `src/services/disbursement-beneficiary-helpers.ts` lines 43-52 — NEW: checks `invoiceNumber + supplierName` globally (no disbursementId scope)
- `src/services/invoice.service.ts` lines 191-198 — existing: checks within same `disbursementId`
- `src/services/report/data-io.service.ts` lines 401-437 — upsert by `invoiceNumber + supplierName` (import context, different semantics)

The new check in `disbursement-beneficiary-helpers.ts` is **globally scoped** (no `disbursementId` filter), while the existing `invoice.service.ts` check is **per-disbursement**. These have different semantics — the new one is stricter (prevents same invoice across different disbursements). This is likely intentional for VAT invoice uniqueness.

**Verdict:** Not a true reuse opportunity — different business rules. But document the difference clearly in code comments so future maintainers understand the distinction.

---

### 4. [LOW] `sanitizeRevenueItems` could be co-located with types

**File:** `src/services/loan-plan.service.ts` lines 41-48

This function sanitizes `RevenueItem[]` by coercing fields to numbers. It's only used within `loan-plan.service.ts` currently, but the AI analyze route (`src/app/api/loan-plans/[id]/ai-analyze/route.ts`) and the XLSX parser (`src/lib/import/xlsx-loan-plan-parser-type-s.ts`) both produce `RevenueItem[]` and could benefit from the same sanitization at their boundary.

**Fix (optional):** Move to `src/lib/loan-plan/loan-plan-types.ts` or a sibling `loan-plan-utils.ts` so all producers can use it. Low priority since the service layer already sanitizes on save.

---

### 5. [LOW] No reuse issue found in templates page

`src/app/report/khcn/templates/page.tsx` correctly reuses:
- `KHCN_TEMPLATES`, `DOC_CATEGORY_LABELS`, `groupByCategory` from `khcn-template-registry.ts`
- `TemplateFileActions` from existing KHDN template component

Good reuse pattern — no issues.

---

## Summary

| # | Severity | File(s) | Issue |
|---|----------|---------|-------|
| 1 | Medium | `loan-plan.service.ts` | `extKeys` array duplicated within same file |
| 2 | Medium | `disbursement-report.service.ts` + `khcn-builder-loan-disbursement.ts` | GN/HDTD field mapping duplicated across services |
| 3 | Low | `disbursement-beneficiary-helpers.ts` vs `invoice.service.ts` | Invoice duplicate check differs in scope (intentional) |
| 4 | Low | `loan-plan.service.ts` | `sanitizeRevenueItems` could be shared utility |
| 5 | None | `khcn/templates/page.tsx` | Good reuse of existing components |

## Positive Observations
- Templates page correctly reuses `TemplateFileActions` from KHDN module — good cross-module sharing
- `groupByCategory` utility properly extracted to registry module
- Longest-prefix active state matching in layout is a clean solution to the nav highlight problem

## Unresolved Questions
- Finding #2: Should GN field mapping be unified given formatting differences (`fmtN()` vs raw), or is the divergence intentional per module?
- Finding #3: Is the globally-scoped duplicate check in `disbursement-beneficiary-helpers.ts` intentional? The existing `invoice.service.ts` check scopes to `disbursementId` — the new one could reject valid invoices that appear in different disbursements.
