# Phase 03: Refactor Forms

## Context
- [Phase 02 Config & Hook](phase-02-design-config-and-hook.md)
- Target files: `customer-info-form.tsx`, `customer-new-form.tsx`

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Replace hardcoded conditionals with hook usage in customer forms

## Refactor Strategy

### Approach: Group-level visibility (not per-field)
Current JSX wraps 5-10 fields in a single `{condition && <>...</>}` block. Replace the condition with `useGroupVisibility`, keeping the same JSX structure. This minimizes diff size.

### File 1: `customer-info-form.tsx`

**Current pattern (L134, L153, L177):**
```tsx
{form.customer_type === "individual" && (
  <button>Scan tai lieu</button>
)}
{form.customer_type === "corporate" && (
  <> ...5 corporate fields... </>
)}
{form.customer_type === "individual" && (
  <> ...10+ individual fields... </>
)}
```

**Refactored:**
```tsx
import { useGroupVisibility, isFieldVisible } from "@/lib/field-visibility/use-field-visibility";

// Inside component:
const showCorporate = useGroupVisibility("customer.corporate_fields", form);
const showIndividual = useGroupVisibility("customer.individual_fields", form);

// JSX:
{isFieldVisible("customer.scan_button", form) && (
  <button>Scan tai lieu</button>
)}
{showCorporate && (
  <> ...5 corporate fields... </>
)}
{showIndividual && (
  <> ...10+ individual fields... </>
)}
```

**Changes:**
- L3: Add import for `useGroupVisibility`, `isFieldVisible`
- L76 (inside component): Add `showCorporate`, `showIndividual` hooks
- L134: Replace `form.customer_type === "individual"` with `isFieldVisible("customer.scan_button", form)`
- L153: Replace `form.customer_type === "corporate"` with `showCorporate`
- L177: Replace `form.customer_type === "individual"` with `showIndividual`

### File 2: `customer-new-form.tsx`

**Current pattern (L125, L151):**
```tsx
{customerType === "corporate" && ( <> ...5 fields... </> )}
{customerType === "individual" && ( <> ...4 fields... </> )}
```

**Refactored:**
```tsx
import { useGroupVisibility } from "@/lib/field-visibility/use-field-visibility";

// formData object for the hook (customerType comes from props, not form state)
const visibilityData = useMemo(() => ({ customer_type: customerType }), [customerType]);
const showCorporate = useGroupVisibility("customer.corporate_fields", visibilityData);
const showIndividual = useGroupVisibility("customer.individual_fields", visibilityData);

// JSX:
{showCorporate && ( <> ...5 fields... </> )}
{showIndividual && ( <> ...4 fields... </> )}
```

**Also refactor submit payload (L57):**
```tsx
// Before:
...(customerType === "corporate" ? { main_business: ... } : { cccd: ... })

// After:
...(showCorporate
  ? { main_business: ..., charter_capital: ..., legal_representative_name: ..., legal_representative_title: ..., organization_type: ... }
  : { cccd: ..., cccd_old: ..., date_of_birth: ..., phone: ... }
)
```
Note: submit payload conditional stays ternary since it's data selection, not visibility. Using same `showCorporate` boolean keeps it DRY.

### Files NOT refactored (and why)

| File | Reason |
|------|--------|
| `customer-detail-view.tsx` | Tab/section routing, not field visibility. `isIndividual` controls which component to render (KhcnProfileCard vs SummaryCards). Config-driven approach adds complexity without benefit. |
| `customer-detail-tabs-config.ts` | Already config-driven (separate arrays). Merging into visibility config would couple unrelated concerns. |
| `loan-plan page.tsx` | `loanMethod` conditionals are coupled with calculation logic (not just visibility). Requires different pattern. |
| `collateral-config.ts` | Already has `FORM_FIELDS` per type + `GTCG_ONLY_KEYS`. Already config-driven. |

## Related Code Files
- **Modify:** `src/app/report/customers/[id]/components/customer-info-form.tsx`
- **Modify:** `src/components/customers/customer-new-form.tsx`

## Implementation Steps

1. Create `src/lib/field-visibility/` directory and 3 files from Phase 02
2. Run `npx tsc --noEmit` to verify types compile
3. Edit `customer-info-form.tsx`:
   - Add imports
   - Add `useGroupVisibility` hooks after `useLanguage()`
   - Replace 3 conditional expressions
4. Edit `customer-new-form.tsx`:
   - Add imports
   - Add `visibilityData` memo + `useGroupVisibility` hooks
   - Replace 2 conditional JSX blocks
   - Update submit payload to use `showCorporate`
5. Run `npx tsc --noEmit` again
6. Manual test: toggle customer type in edit form, verify fields show/hide correctly
7. Manual test: create new customer (both types), verify correct fields appear

## Todo
- [ ] Create `src/lib/field-visibility/` with 3 files
- [ ] Compile check
- [ ] Refactor `customer-info-form.tsx` (3 replacements)
- [ ] Refactor `customer-new-form.tsx` (3 replacements)
- [ ] Compile check
- [ ] Test customer edit form (individual -> corporate toggle)
- [ ] Test customer new form (both types)
- [ ] Code review

## Success Criteria
- Zero `form.customer_type ===` or `customerType ===` in refactored files (for visibility logic)
- All field visibility controlled by `FIELD_VISIBILITY_CONFIG`
- Existing functionality unchanged (no visual regression)
- All files under 200 LOC
- TypeScript compiles without errors

## Risk Assessment
- **Low:** Refactor is mechanical -- replace condition variable, keep JSX structure identical
- **Edge case:** `customer-info-form.tsx` uses `form.customer_type` (mutable state) while `customer-new-form.tsx` uses `customerType` (props). Hook handles both via `formData` parameter.
- **Rollback:** Each file change is independent. Can revert one without affecting the other.

## Security Considerations
- No auth/data changes. Pure frontend rendering logic.
- PII fields (cccd, phone) visibility unchanged -- same conditional logic, just centralized.
