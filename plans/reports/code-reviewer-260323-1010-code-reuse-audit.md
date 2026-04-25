# Code Reuse Audit — 2026-03-23

## Scope
- Files: diff covering modularization of AiMappingModal, FinancialAnalysisModal (KHDN), LoanPlanEditorPage, customer-info-form, khcn-doc-checklist, customer API route
- Focus: duplicate types, helpers, sub-components across new extracted modules

## Overall Assessment
The modularization itself is well-structured -- splitting large files into focused modules. However, it introduced **significant code duplication** because the extracted sub-components were not consolidated with existing equivalents in `src/components/financial-analysis/`.

---

## CRITICAL: Duplicate FinancialAnalysis Module Trees

Two parallel `financial-analysis` module trees now exist with overlapping types, constants, helpers, and sub-components:

### Location A: `src/app/report/khdn/mapping/components/Modals/financial-analysis-*` (KHDN embedded modal)
### Location B: `src/components/financial-analysis/` (standalone modal, newer/richer version)

### Finding 1 — Duplicate `CSTC_LABELS` (High)

Defined in **three** places:

| File | Variation |
|------|-----------|
| `src/app/report/khdn/mapping/components/Modals/financial-analysis-constants.ts:7` | Short labels (e.g., "HS thanh toan tong quat") |
| `src/components/financial-analysis/financial-analysis-constants.ts:38` | Same short labels, minor diff on "soNgayThu" |
| `src/services/financial-analysis-formatters.ts:17` | Long labels with formulas (e.g., "He so thanh toan tong quat (Tong TS / No phai tra)") |

**Recommendation**: Keep one canonical `CSTC_LABELS` in `src/services/financial-analysis-formatters.ts` (already the richest), export short aliases as a derived map if needed. Delete the other two definitions.

### Finding 2 — Duplicate `fmtRatio` (High)

Defined in **three** places:

| File | Behavior |
|------|----------|
| `src/app/report/khdn/mapping/components/Modals/financial-analysis-constants.ts:37` | `v.toFixed(2)`, null returns "--" |
| `src/components/financial-analysis/financial-analysis-utils.ts:14` | `v.toFixed(digits)` with configurable precision, null returns "--" |
| `src/services/financial-analysis-formatters.ts:53` | `v.toFixed(2)`, null returns "N/A" |

**Recommendation**: Consolidate into the `financial-analysis-utils.ts` version (most flexible). The service formatter can import and adapt.

### Finding 3 — Duplicate `fmt` / `fmtNum` (High)

| File | Function | Null handling |
|------|----------|---------------|
| `src/app/report/khdn/mapping/components/Modals/financial-analysis-constants.ts:31` | `fmt()` | Returns "--" |
| `src/components/financial-analysis/financial-analysis-utils.ts:6` | `fmtNum()` | Returns "--", vi-VN locale |
| `src/services/financial-analysis-formatters.ts:46` | `fmtNum()` | Returns "N/A", en-US locale |

Three implementations doing the same thing with minor formatting differences. Should be a single utility.

### Finding 4 — Duplicate `SummaryCard` Component (Medium)

| File | Differences |
|------|-------------|
| `src/app/report/khdn/mapping/components/Modals/financial-analysis-summary-card.tsx` | Accepts `string \| number` for value, no `sub` prop |
| `src/components/financial-analysis/financial-analysis-summary-card.tsx` | Accepts `string` only, has optional `sub` prop, slightly different styling |

Identical purpose, near-identical markup. Should be consolidated.

### Finding 5 — Duplicate `CollapsibleSection` Component (Medium)

| File | Differences |
|------|-------------|
| `src/app/report/khdn/mapping/components/Modals/financial-analysis-collapsible-section.tsx` | Controlled: `expanded`/`onToggle` props, has `badge` prop |
| `src/components/financial-analysis/financial-analysis-collapsible-section.tsx` | Uncontrolled: internal `useState`, `defaultOpen` prop, no badge |

Same visual pattern, different state management. Merge into one with optional controlled/uncontrolled modes.

### Finding 6 — Duplicate `FinancialTable` Component (Medium)

| File | Differences |
|------|-------------|
| `src/app/report/khdn/mapping/components/Modals/financial-analysis-table.tsx` | Uses local `fmt()`, basic styling |
| `src/components/financial-analysis/financial-analysis-table.tsx` | Uses `fmtNum()`, imports `BOLD_CODES` for row emphasis |

Same purpose: renders CDKT/KQKD rows. The standalone version is richer (bold rows for summary codes).

### Finding 7 — Duplicate `FinancialAnalysisModalProps` Type (Medium)

| File | Differences |
|------|-------------|
| `src/app/report/khdn/mapping/components/Modals/financial-analysis-types.ts` | Has `embedded?` prop, callback is `onApplyValues` |
| `src/components/financial-analysis/financial-analysis-types.ts` | No `embedded`, callback is `onApply`, has `Step`, `QualitativeContext`, `AnalysisData` types |

Two versions of the same modal with different prop signatures is confusing and will cause maintenance burden.

### Finding 8 — Duplicate `STEP_TITLES` / `STEP_LABELS` (Low)

| File | Name | Values |
|------|------|--------|
| `src/app/report/khdn/mapping/components/Modals/financial-analysis-constants.ts:4` | `STEP_TITLES` | `["Upload BCTC", "Xem du lieu", "Thong tin bo sung", "Phan tich AI"]` |
| `src/components/financial-analysis/financial-analysis-constants.ts:61` | `STEP_LABELS` | `["Upload BCTC", "Xem du lieu", "Thong tin dinh tinh", "Ket qua AI"]` |

Nearly identical; differences only in wording of steps 3 and 4.

---

## HIGH: Duplicate `fmtVND` Across Codebase

`fmtVND` is defined locally in **four** places:

| File | Implementation |
|------|----------------|
| `src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-editor-utils.ts:3` | `n.toLocaleString("vi-VN") + "d"` |
| `src/app/report/customers/[id]/loan-plans/page.tsx:29` | `fmtDisplay(n) + "d"` |
| `src/services/email.service.ts:43` | `n.toLocaleString("vi-VN")` + "d" with `Math.round` |
| `src/components/loan-plan/xlsx-import-preview-modal.tsx:18` | `fmtDisplay(n)` (no "d" suffix) |

Existing central utility: `fmtDisplay` at `src/lib/invoice-tracking-format-helpers.ts:29` does `Intl.NumberFormat("vi-VN").format(n)`.

**Recommendation**: Add a `fmtVND` export to `src/lib/invoice-tracking-format-helpers.ts` that appends "d", then replace all 4 local definitions. (This was already recommended in a prior review `code-reviewer-260311-0101-code-reuse-audit.md` but was not addressed.)

---

## HIGH: Duplicate `RevenueItem` Type

| File | Fields |
|------|--------|
| `src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-editor-types.ts:3` | `{description, qty, unitPrice, amount}` |
| `src/lib/loan-plan/loan-plan-types.ts:11` | `{description, qty, unitPrice, amount}` -- **identical** |

**Recommendation**: Import from `@/lib/loan-plan/loan-plan-types` instead of redefining.

---

## MEDIUM: `Financials` Type Overlap

| File | Type name |
|------|-----------|
| `src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-editor-types.ts:10` | `Financials` — 15 fields including credit assessment fields |
| `src/lib/loan-plan/loan-plan-types.ts:18` | `LoanPlanFinancials` — 12 base fields |
| `src/app/report/customers/[id]/loan-plans/page.tsx:22` | Local `Financials` — 4 fields (subset) |

The editor-types `Financials` extends `LoanPlanFinancials` with 6 credit assessment fields. Should be defined as `LoanPlanFinancials & { ... }` to avoid duplicating the base 12 fields.

---

## MEDIUM: Two Separate FinancialAnalysisModal Components

There are now **two separate** FinancialAnalysisModal implementations:

1. **KHDN embedded**: `src/app/report/khdn/mapping/components/Modals/FinancialAnalysisModal.tsx` — older, embedded in AiMappingModal, 4-step wizard with violet theme
2. **Standalone**: `src/components/financial-analysis/FinancialAnalysisModal.tsx` — newer, full standalone modal, 4-step wizard with emerald theme, has `AiResultRow`, `validateFile`, edit tracking

Both call the same API endpoints (`/api/report/financial-analysis/extract` and `/api/report/financial-analysis/analyze`). The standalone version is more feature-complete (file validation, edit tracking, reset-to-original per field). The KHDN version supports `embedded` mode.

**Recommendation**: Consolidate into one component in `src/components/financial-analysis/`. Add `embedded` prop support to the standalone version, then delete the KHDN copy and its 7 extracted sub-modules.

---

## LOW: `SubTablePreview` Only in KHDN Version

`src/app/report/khdn/mapping/components/Modals/financial-analysis-sub-table-preview.tsx` exists only in the KHDN module tree. The standalone `src/components/financial-analysis/` does not have it. If consolidation happens, this component should be moved to the shared location.

## LOW: `StepDots` Only in KHDN Version

`src/app/report/khdn/mapping/components/Modals/financial-analysis-step-dots.tsx` -- the standalone version uses a different step indicator UI built inline. If consolidating, choose one approach.

---

## Summary of Duplicate Items

| Item | Copies | Priority |
|------|--------|----------|
| `CSTC_LABELS` | 3 | High |
| `fmtRatio` | 3 | High |
| `fmt`/`fmtNum` | 3 | High |
| `fmtVND` | 4 | High |
| `RevenueItem` type | 2 (identical) | High |
| `FinancialAnalysisModal` component | 2 | Medium |
| `SummaryCard` component | 2 | Medium |
| `CollapsibleSection` component | 2 | Medium |
| `FinancialTable` component | 2 | Medium |
| `FinancialAnalysisModalProps` type | 2 | Medium |
| `Financials` / `LoanPlanFinancials` type | 3 | Medium |
| `STEP_TITLES` / `STEP_LABELS` | 2 | Low |

---

## Recommended Actions (Prioritized)

1. **Consolidate all `fmtVND`** into `src/lib/invoice-tracking-format-helpers.ts`. Replace 4 local copies.
2. **Consolidate `CSTC_LABELS`**, `fmtRatio`, `fmtNum`/`fmt` into one shared module (likely `src/services/financial-analysis-formatters.ts` or a new `src/lib/financial-analysis-helpers.ts`).
3. **Delete `src/app/report/khdn/mapping/components/Modals/financial-analysis-*.ts(x)`** (7 files). The KHDN `FinancialAnalysisModal` should import the standalone version from `src/components/financial-analysis/`, adding `embedded` prop support to that component.
4. **Import `RevenueItem` from `@/lib/loan-plan/loan-plan-types`** in `loan-plan-editor-types.ts` instead of redefining.
5. **Extend `Financials` from `LoanPlanFinancials`** in `loan-plan-editor-types.ts` to avoid duplicating 12 base fields.

---

## Positive Observations

- The AiMappingModal modularization (types, utils, chip, 4 tab files) is clean with clear separation of concerns and no inter-tab code duplication.
- Extracting `TreeRow`, `Stat`, `RepaymentScheduleTable`, `CreditAssessmentSection` from the loan plan editor page is a good pattern.
- `loan-plan-editor-utils.ts` and `loan-plan-editor-types.ts` keep the main page focused on state/render logic.

---

## Unresolved Questions

1. Is the KHDN embedded `FinancialAnalysisModal` still actively used/needed, or has the standalone version fully replaced it? If both are needed, should they share a single code path?
2. Should `fmtVND` live in `invoice-tracking-format-helpers.ts` (current naming suggests invoice-tracking scope) or be moved to a more generic `format-helpers.ts`?
