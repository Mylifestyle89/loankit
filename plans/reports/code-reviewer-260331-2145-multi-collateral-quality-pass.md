# Code Review Pass 2: Multi-Collateral Loan Selection — Quality Focus

**Reviewer:** code-reviewer | **Date:** 2026-03-31 | **Prior review:** code-reviewer-260331-2137

## Scope

- 4 files reviewed (focus: redundant state, parameter sprawl, copy-paste, stringly-typed code, leaky abstractions)
- Prior review C1 (migration) resolved. C2 (auth guard GET collaterals) still open. H1 (Zod refine) fixed.

---

## Prior Issues — Status Check

| ID | Issue | Status |
|----|-------|--------|
| C1 | Missing migration | FIXED — `20260331141000_add_loan_selected_collateral_ids` exists |
| C2 | GET collaterals missing auth | OPEN — line 8 still has no auth guard |
| H1 | Zod validation | FIXED — `.refine()` added with proper JSON array check |
| H3 | `fmtVND(0)` bug | FALSE POSITIVE — `n == null` correctly passes 0 through |

---

## New Findings

### HIGH: Stringly-typed `selectedCollateralIds` — JSON-in-a-column anti-pattern

`selectedCollateralIds` is stored as a JSON string in a text column, parsed in 3 separate locations:

1. `page.tsx:260` — inline IIFE `(() => { try { return JSON.parse(loan.selectedCollateralIds || "[]"); } catch { return []; } })()`
2. `khcn-report.service.ts:59-65` — try-catch parse
3. `route.ts:47-49` — Zod refine parse

Each location re-implements the same parse-with-fallback logic. The inline IIFE in JSX (line 260) is particularly hard to read.

**Fix:** Extract a utility:
```ts
// lib/parse-json-ids.ts
export function parseJsonIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a.filter((x): x is string => typeof x === "string") : []; }
  catch { return []; }
}
```

Replace all 3 parse sites. Eliminates DRY violation and the inline IIFE.

### HIGH: C2 still open — GET collaterals unauthenticated

`src/app/api/customers/[id]/collaterals/route.ts` line 8: GET handler has no auth check. POST (line 31) has `requireEditorOrAdmin()`. Any unauthenticated user can enumerate customer collateral data including financial values. This is a data leak for PII-sensitive Agribank deployment.

**Fix:** Add `await requireEditorOrAdmin();` as first line in GET handler.

### MEDIUM: Duplicate `PickerCollateral` type (DRY violation)

Identical type defined at:
- `loan-collateral-picker.tsx:8-14`
- `page.tsx:45-51`

5 fields, exact same shape. If a field is added/changed, both must stay in sync manually.

**Fix:** Export from picker, import in page:
```ts
// loan-collateral-picker.tsx
export type PickerCollateral = { ... };
// page.tsx
import { PickerCollateral } from "./components/loan-collateral-picker";
```

### MEDIUM: Redundant `|| "[]"` fallback

`page.tsx:260`: `loan.selectedCollateralIds || "[]"` — DB default is already `"[]"` (schema line 208). The `||` is defensive but misleading: suggests the value could be null/undefined when it cannot (column has NOT NULL + default). If using the `parseJsonIds` util above, this becomes moot.

### MEDIUM: Untyped API response (`any` cast)

`page.tsx:149`: `.map((c: any) => ({...}))` — loses type safety on collateral API response. Define a response type or use the shared `PickerCollateral` type.

### LOW: Collateral fetch silently swallows errors

`page.tsx:154`: `.catch(() => {})` — no logging, no user feedback. Picker silently missing is confusing. At minimum add `console.error`.

### LOW: `onSave` callback in page.tsx lacks granular error handling

`page.tsx:262-268`: `if (!res.ok) throw new Error("Luu that bai")` discards the server's error message. Should parse response body for specific validation errors.

---

## Positive Observations

- `loan-collateral-picker.tsx` is clean, well-scoped at 155 lines, good separation
- `hasChanged` diffing via Set comparison is efficient
- Backward compat pattern (empty = use all) consistently applied in service + picker
- Zod `.refine()` on route validates JSON structure server-side (fixed since last review)
- Grouped-by-type UI with running totals is good UX

---

## Recommended Actions (Priority)

1. **Add auth guard** to GET collaterals endpoint (security — C2 still open)
2. **Extract `parseJsonIds` utility** to eliminate 3x copy-paste JSON parse
3. **Export `PickerCollateral`** from picker, import in page (DRY)
4. **Type the collateral API response** instead of `any` cast
5. **Add `console.error`** to silent `.catch(() => {})` in collateral fetch

---

## Unresolved Questions

1. C2 auth guard: was the GET endpoint intentionally left unprotected for a reason (e.g., public-facing feature)?
