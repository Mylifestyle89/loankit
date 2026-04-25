# Code Reuse Audit — Disbursement Field Suggestions
Date: 2026-04-03

## Scope
- `src/components/suggest-input.tsx` (new)
- `src/app/api/loans/[id]/disbursement-suggestions/route.ts` (new)
- `src/services/disbursement.service.ts` (addMethod)
- `src/components/invoice-tracking/disbursement-form-modal.tsx` (additions)

---

## 1. SuggestInput vs BeneficiarySection inline autocomplete

**Verdict: Partial duplicate — extraction is correct but BeneficiarySection not yet migrated.**

`beneficiary-section-form.tsx` lines 62–106 contains an inline autocomplete pattern that is structurally identical to `SuggestInput`:
- same `showSearch` state + `onFocus`/`onBlur(setTimeout 200ms)` pattern
- same dropdown markup: `absolute z-20 mt-1 w-full max-h-* overflow-auto rounded-md border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#1a1a1a] shadow-lg`
- same item button class: `w-full text-left px-3 py-1.5 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors`

The only difference: `BeneficiarySection` renders extra metadata (`s.accountNumber`) inside the option button and calls `onSelectSaved(s)` with a full object, not just a string. This is a caller-side concern that `SuggestInput` does not need to know about — `SuggestInput` could serve this via a render-prop or `renderOption` callback.

**Impact:** Two maintenance surfaces for the same dropdown UI. If style or keyboard-nav is ever updated, both files must be updated in sync.

---

## 2. Fetch pattern duplication in disbursement-form-modal

`disbursement-form-modal.tsx` now has **4 independent bare `useEffect + fetch` blocks** (lines 59, 109, 123, 134), each with the same `(async () => { try { ... } catch { } })()` IIFE pattern. There is no shared data-fetching hook or utility anywhere in `src/hooks/` or `src/lib/` to deduplicate these. The fetch pattern itself is not duplicated from elsewhere in the codebase — it is consistent within the file — so this is a low-severity intra-file smell, not a cross-file reuse miss.

**No existing shared fetch hook to reuse was found.**

---

## 3. No other autocomplete/combobox components found

Glob over `src/components/**/*{autocomplete,suggest,combobox,typeahead}*` returned only `suggest-input.tsx` itself. There is no pre-existing generic component that `SuggestInput` duplicates.

---

## Summary

| # | Issue | Severity |
|---|-------|----------|
| 1 | `BeneficiarySection` still contains an inline autocomplete identical to `SuggestInput`; should migrate to use the new component | Medium |
| 2 | 4 bare `useEffect+fetch` IIFEs in one modal; no shared hook exists — intra-file smell only | Low |
| 3 | No pre-existing autocomplete component duplicated | Clean |

---

## Unresolved Questions
- `BeneficiarySection` needs `onSelectSaved(SavedBeneficiary)` called with a full object, not just the string label. Should `SuggestInput` accept a generic `T` + `renderOption`/`onSelect(item: T)` prop, or is a separate `SavedBeneficiaryInput` wrapper component preferred?
