# Code Review: KHCN Customer Layout Redesign

**Date:** 2026-03-15
**Files reviewed:** 3 (page.tsx, khcn-profile-card.tsx, customer.service.ts)

## Overall Assessment

Solid implementation. DN layout untouched -- conditional branching is clean. Profile card handles nulls well. Two issues worth fixing.

## Critical Issues

None.

## High Priority

### 1. `outstandingBalance` duplicates `totalLoanAmount` for active loans -- misleading metric
**File:** `src/services/customer.service.ts` line 438
```ts
outstandingBalance: activeLoans.reduce((s, l) => s + l.loanAmount, 0),
```
This sums `loanAmount` (original loan principal) not actual outstanding balance. `totalLoanAmount` on line 428 already sums all loans' `loanAmount`. For active loans specifically, this is just a subset of the same field. The label "outstandingBalance" implies remaining principal after repayments, which this does NOT compute.

**Impact:** Profile card shows misleading "Du no" figure to users.
**Fix:** Either rename to `activeLoanAmount` to be honest about what it is, or compute actual outstanding = loanAmount - sum(disbursement repayments) if that data exists.

### 2. `handleSubmit` missing try-catch
**File:** `src/app/report/customers/[id]/page.tsx` line 166-200
The `fetch` call in `handleSubmit` has no try-catch. Network errors will leave `saving=true` forever.

**Fix:** Wrap in try-catch like `loadCustomer` does, call `setSaving(false)` in finally/catch.

## Medium Priority

### 3. Tab remap effect may flash wrong content for one render
**File:** `src/app/report/customers/[id]/page.tsx` line 157-162
When navigating with `?tab=loans` to an individual customer, the first render has `activeTab="loans"` and `isIndividual=false` (customer not loaded yet). After load, effect fires and remaps. Between load and effect, tabs render with `allTabs` briefly then switch to `khcnTabs`. Functionally harmless since loading spinner covers it, but if loading is removed or becomes partial, this could flash.

### 4. KhcnDocChecklist only uses first loan
**File:** `src/app/report/customers/[id]/page.tsx` line 426-429
```ts
loanMethod={customer.loans?.[0]?.loan_method}
loanId={customer.loans?.[0]?.id}
```
Always picks first loan. If customer has multiple loans with different methods, user has no way to select which. May be intentional for MVP.

### 5. Page exceeds 200 lines (437 lines)
Per project rules, should be modularized. The form in "info" tab (lines 286-373) and the loans-credit merged tab (lines 390-414) are good extraction candidates.

## Low Priority

### 6. Loan count badge on wrong tab key for KHCN
**File:** `src/app/report/customers/[id]/page.tsx` line 248
```ts
{tab.key === "loans" && customer?.summary ? ` (${customer.summary.totalLoans})` : ""}
```
KHCN tabs don't have a `key="loans"` tab -- they use `"loans-credit"`. So the count badge never shows for individual customers. Should also check `tab.key === "loans-credit"`.

## DN Regression Check

- DN path: `allTabs` used when `customer_type !== "individual"` -- unchanged
- `CustomerSummaryCards` rendered for DN -- unchanged
- "loans" and "credit" tabs render independently for DN -- guarded by `!isIndividual`
- Form fields conditional on `customer_type === "corporate"` -- unchanged

**Verdict:** No DN regression.

## Positive Observations

- Profile card is self-contained, pure presentational, well-typed
- `debtGroupColor` and `isNearMaturity` helpers are clear and testable
- Null handling throughout profile card is thorough
- Tab remapping logic correctly sets sub-tab when coming from `?tab=credit`

## Recommended Actions (priority order)

1. Fix `handleSubmit` missing try-catch (High -- bug)
2. Fix loan count badge for KHCN tabs (Low -- cosmetic but easy)
3. Rename `outstandingBalance` or add comment clarifying it's active loan principal sum (High -- misleading)
4. Consider extracting info form and loans-credit tab into sub-components (Medium -- 200-line rule)
