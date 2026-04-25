# Code Review: PA Data Builder Refactor

**Files:** `src/services/khcn-report-data-builders.ts` (L446-528), `src/services/khcn-report.service.ts` (L171-174)
**Focus:** Correctness, DRY, error handling

## Overall Assessment

Refactoring is clean. Duplicate PA.* block fully removed from service — single source of truth in builder. Universal loop arrays replace hardcoded costNameMap. Structure is good.

## High Priority

### 1. Division by zero in "Ty le von tu co" (L497-499)

```ts
data["PA.Ty le von tu co"] = financials.loanNeed && financials.counterpartCapital
  ? ((financials.counterpartCapital / financials.loanNeed) * 100).toFixed(1) + "%"
  : "";
```

If `loanNeed` is `0` (falsy), the guard catches it. But if `loanNeed` is a non-zero truthy **string** like `"abc"`, division produces `NaN`. The UI page has identical logic so this is a pre-existing issue, but worth a defensive check:

```ts
const need = parseFloat(financials.loanNeed);
const cap = parseFloat(financials.counterpartCapital);
data["PA.Ty le von tu co"] = need > 0 && !isNaN(cap)
  ? ((cap / need) * 100).toFixed(1) + "%"
  : "";
```

### 2. Silent catch blocks (L500, L514, L527)

`catch { /* ignore */ }` on financials parse is acceptable for report generation (don't crash on bad data). However, a `console.warn` would help debugging template issues in production. Low-effort improvement.

## Medium Priority

### 3. DRY: "PA.Tong chi phi du kien" fallback to totalCost (L489)

```ts
data["PA.Tong chi phi du kien"] = financials.totalExpenses ?? financials.totalCost ?? "";
```

And line 493:
```ts
data["PA.Tong chi phi"] = financials.totalCost ?? "";
```

These may produce same value when `totalExpenses` is absent. Not a bug, but document intent — are these semantically different fields or aliases?

### 4. Revenue item field name inconsistency

Cost items use `name` for display (`c.name`), revenue items use `description` (`r.description`). If upstream data ever sends `name` for revenue items, it silently becomes `undefined`. Consider `r.description ?? r.name ?? ""` for resilience.

## Low Priority

### 5. Type annotation on plan parameter could be extracted

The inline type `{ name: string; financials_json: string; cost_items_json: string; revenue_items_json: string }` is reasonable for a single use, but if more builders consume this shape, extract a type.

## Positive Observations

- No duplicate PA.* fields remain in service — DRY achieved
- Null guard `if (!plan) return` is clean
- Loop arrays with STT index are well-structured for docxtemplater
- `numberToVietnameseWords` reuse for multiple amount fields is good
- Three separate try-catch blocks isolate failures per section (financials vs cost vs revenue)

## Recommended Actions

1. **[High]** Add numeric parsing guard on ratio calculation
2. **[Medium]** Add `console.warn` to catch blocks with context
3. **[Low]** Document totalExpenses vs totalCost semantic difference
