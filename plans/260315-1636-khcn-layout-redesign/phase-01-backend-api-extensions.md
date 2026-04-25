# Phase 1: Backend API Extensions

**Status:** complete
**Priority:** high
**Effort:** 0.5h
**Completed:** 2026-03-15

## Overview

Added 4 computed fields to `getFullProfile` response to support KHCN profile card UI without requiring database changes or new API endpoints.

## Key Insights

- No DB migration needed: debt_group already exists on Loan model
- maturityDate available via endDate on Loan model
- co-borrower count computed from relation count
- Outstanding balance aggregated from loan records
- All fields fit naturally into existing `summary` object response structure

## Implementation Summary

### Modified Files

**src/services/customer.service.ts**

Added computed fields to `getFullProfile` summary response:

1. `debtGroup` — from Loan.debt_group of most recent/primary loan (string)
2. `nearestMaturity` — endDate of loan with nearest future maturity (ISO date string)
3. `coBorrowerCount` — count from co_borrowers relation (number)
4. `outstandingBalance` — sum of outstanding_balance from all loans (number)

### Related Code Changes

- Extended Prisma include: added `co_borrowers: { select: { id: true } }` for count
- Added Loan include in query: `{ select: { debt_group: true, endDate: true, outstanding_balance: true } }`
- No breaking changes to existing API contract

## Todo List

- [x] Add debtGroup field to summary computation
- [x] Add nearestMaturity field to summary computation
- [x] Add coBorrowerCount via co_borrowers include
- [x] Add outstandingBalance aggregation
- [x] Verify API response in browser
- [x] Test with both KHCN and DN customers

## Success Criteria

✅ getFullProfile returns all 4 new fields in summary object
✅ Fields populate correctly for test customers
✅ No null/undefined values for fields
✅ Backward compatible with existing DN layout

## Next Steps

Phase 2: Frontend implementation uses these computed fields in khcn-profile-card.tsx
