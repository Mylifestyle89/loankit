# Phase 3: Backend Pagination & Validation

**Priority:** IMPORTANT | **Effort:** 3h | **Status:** pending | **Deps:** Phase 1

## Reports Reference

- Backend H1, H2, H3, H4, H6, M2

## Implementation Steps

### 3.1 Add pagination to list endpoints

Add `take`/`skip` params (default: take=50, skip=0) to:

- [ ] `src/services/customer.service.ts` — `list()` method
- [ ] `src/services/loan.service.ts` — `list()` method
- [ ] `src/services/invoice.service.ts` — `listAll()` method
- [ ] `src/services/beneficiary.service.ts` — `list()` method
- [ ] Update corresponding API routes to accept `?page=&limit=` query params
- [ ] Return `{ data, total, page, limit }` response shape

### 3.2 Fix getCustomerSummary memory issue

**File:** `src/services/invoice.service.ts`
- [ ] Replace in-memory aggregation with Prisma `groupBy` or raw SQL
- [ ] Compute totals at DB level instead of loading all records

### 3.3 Optimize getFullProfile

**File:** `src/services/customer.service.ts`
- [ ] Limit nested includes to essential fields
- [ ] Add `take` limits on nested relations (loans, disbursements)
- [ ] Or: lazy-load sub-resources via separate API calls (frontend already does tabs)

### 3.4 Add Zod validation to KHCN sub-resource routes

Create schemas and validate request body in:

- [ ] `src/app/api/customers/[id]/collaterals/route.ts`
- [ ] `src/app/api/customers/[id]/co-borrowers/route.ts`
- [ ] `src/app/api/customers/[id]/credit-agribank/route.ts`
- [ ] `src/app/api/customers/[id]/credit-other/route.ts`
- [ ] `src/app/api/customers/[id]/related-persons/route.ts`

### 3.5 Fix error handling in sub-resource routes

- [ ] Replace raw `e.message` with `toHttpError(e)` in all sub-resource route catch blocks
- [ ] Same files as 3.4

### 3.6 Extract error handling wrapper (DRY)

- [ ] Create `src/lib/api/with-error-handling.ts` — wrapper function for route handlers
- [ ] Handles: ZodError → 400, AuthError → 401/403, NotFoundError → 404, generic → 500
- [ ] Migrate sub-resource routes to use it first, then gradually adopt elsewhere

## Success Criteria

- All list endpoints paginated with sensible defaults
- No unbounded DB queries loading full tables into memory
- All POST/PATCH routes validate input with Zod
- Consistent error response format
