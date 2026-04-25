# Code Reuse Review: Multi-Collateral Loan Selection

**Date:** 2026-03-31
**Scope:** 7 changed files, focus on duplication and missed reuse opportunities

---

## Critical: `fmtVND` / `formatVND` duplicated 7+ times

The same VND formatting logic (`new Intl.NumberFormat("vi-VN").format(n)`) exists in **7 independent copies**:

| File | Name | Signature |
|------|------|-----------|
| `src/lib/invoice-tracking-format-helpers.ts:29` | `fmtDisplay` | `(n: number) => string` |
| `src/app/report/loans/[id]/components/loan-collateral-picker.tsx:24` | `fmtVND` | `(n: number \| null) => string` |
| `src/app/report/customers/[id]/components/khcn-profile-card.tsx:23` | `formatVND` | `(amount: number) => string` |
| `src/app/report/customers/[id]/components/customer-summary-cards.tsx:17` | `formatVND` | `(amount: number) => string` |
| `src/app/report/customers/[id]/components/customer-loans-section.tsx:45` | `formatVND` | `(amount: number) => string` |
| `src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-editor-utils.ts:3` | `fmtVND` | `(n: number) => string` |
| `src/app/report/customers/[id]/loan-plans/page.tsx:30` | `fmtVND` | wraps `fmtDisplay` |
| `src/services/email.service.ts:43` | `fmtVND` | `(amount: number) => string` |

**Recommendation:** Shared `fmtDisplay` already exists at `src/lib/invoice-tracking-format-helpers.ts:29`. All copies should import it. The picker's null-handling variant can be a one-liner wrapper:

```ts
import { fmtDisplay } from "@/lib/invoice-tracking-format-helpers";
const fmtVND = (n: number | null) => n == null ? "—" : fmtDisplay(n);
```

**Priority: HIGH** -- 7 copies means 7 places to update if locale logic changes.

---

## Medium: `PickerCollateral` type duplicated

`PickerCollateral` is defined identically in two files:
- `src/app/report/loans/[id]/page.tsx:45-51`
- `src/app/report/loans/[id]/components/loan-collateral-picker.tsx:8-14`

Both have `{ id, name, collateral_type, total_value, obligation }`.

**Recommendation:** Export from picker component, import in page. Or extract to a shared types file under `loans/[id]/`.

---

## Medium: `selectedCollateralIds` JSON parse pattern repeated 3 times

Same try/catch + `JSON.parse` + fallback pattern in:
1. `src/app/report/loans/[id]/page.tsx:260` -- inline IIFE
2. `src/services/khcn-report.service.ts:59-66` -- try/catch block
3. `src/app/api/loans/[id]/route.ts:47-49` -- zod refine

**Recommendation:** Extract a utility:

```ts
export function parseCollateralIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a.filter((i): i is string => typeof i === "string") : []; }
  catch { return []; }
}
```

---

## Low: Hardcoded interest rate strings duplicated

Both services hardcode the same Agribank policy rates:
- `src/services/khcn-report.service.ts:136-137`: `"150% lai suat trong han"`, `"10%/nam"`
- `src/services/disbursement-report.service.ts:139-140`: Same values

**Recommendation:** Extract to a shared constant (e.g., `AGRIBANK_RATE_POLICY` object). Comment says "rarely changes" but DRY still applies -- one source of truth is easier to audit.

---

## Low: `COLLATERAL_TYPES` reuse is correct

The picker properly imports `COLLATERAL_TYPES` from `collateral-config.ts` for group labels. No issue here.

---

## Summary

| Priority | Issue | Effort |
|----------|-------|--------|
| HIGH | 7x `fmtVND`/`formatVND` copies -- consolidate to `fmtDisplay` | ~15 min |
| MEDIUM | `PickerCollateral` type duplicated | ~5 min |
| MEDIUM | JSON parse pattern for selectedCollateralIds x3 | ~10 min |
| LOW | Hardcoded rate strings x2 | ~5 min |

**Total estimated cleanup: ~35 min**

No unresolved questions.
