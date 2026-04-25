# Phase 1: Backend - Add Computed Fields to Customer API

## Overview
- **Priority:** High (blocks frontend)
- **Status:** pending
- **Effort:** 0.5h

## Context
`getFullProfile()` in `customer.service.ts` (line 366-426) already computes summary stats and includes loans with all relations. We need 3 additional computed fields for KHCN profile card.

## What to Add to Summary Object

Add these fields to the `summary` object returned by `getFullProfile`:

```ts
// Add to summary computation (after line 422)
debtGroup: string | null       // Worst (highest number) debt_group across active loans
nearestMaturity: string | null  // Earliest endDate among active loans, ISO string
coBorrowerCount: number         // Count of co-borrowers for this customer
outstandingBalance: number      // Sum of loanAmount for active loans (du no)
```

## Implementation Steps

### 1. Extend summary in `getFullProfile` (`src/services/customer.service.ts`)

In the `getFullProfile` method, add co-borrower count query and compute new fields:

```ts
// Add to the include block (line 369):
co_borrowers: { select: { id: true } },

// After the existing summary computation (line 411-423), add:
const activeLoans = loans.filter(l => l.status === "active");

const debtGroups = activeLoans
  .map(l => l.debt_group)
  .filter((d): d is string => d !== null && d !== "")
  .sort((a, b) => Number(b) - Number(a));

const nearestEndDate = activeLoans
  .map(l => l.endDate)
  .filter(Boolean)
  .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

// Add to summary object:
debtGroup: debtGroups[0] ?? null,
nearestMaturity: nearestEndDate?.toISOString() ?? null,
coBorrowerCount: customer.co_borrowers.length,
outstandingBalance: activeLoans.reduce((s, l) => s + l.loanAmount, 0),
```

### 2. Update FullCustomer type in page.tsx

Add new fields to the `summary` type in `page.tsx` (line 43-53):
```ts
debtGroup: string | null;
nearestMaturity: string | null;
coBorrowerCount: number;
outstandingBalance: number;
```

## Todo
- [ ] Add `co_borrowers` to include in `getFullProfile`
- [ ] Compute debtGroup (worst across active loans)
- [ ] Compute nearestMaturity (earliest endDate of active loans)
- [ ] Compute outstandingBalance (sum active loan amounts)
- [ ] Add coBorrowerCount
- [ ] Update FullCustomer type in page.tsx
- [ ] Verify API response with `curl` or browser

## Success Criteria
- GET `/api/customers/[id]?full=true` returns new summary fields
- DN customers also get these fields (harmless, just extra data)
- No breaking changes to existing summary fields
