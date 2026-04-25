# Phase 1: DB Migration + API

## Context
- [Brainstorm](../reports/brainstorm-260331-1757-multi-collateral-loan-selection.md)
- [Prisma Schema](../../prisma/schema.prisma) — Loan model line ~156
- [Loan API Route](../../src/app/api/loans/[id]/route.ts) — PATCH handler

## Overview
- **Priority**: P1 (blocker for Phase 3)
- **Status**: pending
- **Effort**: 30m

Add `selectedCollateralIds` JSON field to Loan model. Update API to accept it.

## Key Insights
- SQLite, Prisma — JSON stored as String with `@default("[]")`
- No junction table needed — collateral list it thay doi, KISS
- Existing PATCH `/api/loans/[id]` already has updateSchema + loanService.update()

## Requirements
- Loan model co field `selectedCollateralIds String @default("[]")`
- API PATCH accepts `selectedCollateralIds` as string array (validate JSON array of strings)
- loanService.update() passes through to Prisma

## Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add field to Loan model |
| `src/app/api/loans/[id]/route.ts` | Add to updateSchema |
| `src/services/loan.service.ts` | No change needed if generic update |

## Implementation Steps

1. **Schema change** — Add to Loan model in `prisma/schema.prisma`:
   ```prisma
   selectedCollateralIds String @default("[]") // JSON array of Collateral IDs
   ```
   Place after `status` field (line ~173).

2. **Migration** — Run:
   ```bash
   npx prisma migrate dev --name add_loan_selected_collateral_ids
   ```

3. **API route** — In `src/app/api/loans/[id]/route.ts`, add to `updateSchema`:
   ```ts
   selectedCollateralIds: z.string().optional(), // JSON array string
   ```
   Note: Store as JSON string, parse/validate on client. Keep API simple.

4. **Verify** — `npx prisma generate` + compile check.

## Todo
- [ ] Add `selectedCollateralIds` to Prisma Loan model
- [ ] Run migration
- [ ] Add field to API updateSchema
- [ ] Compile check

## Success Criteria
- Migration applies cleanly
- PATCH `/api/loans/[id]` accepts `selectedCollateralIds`
- Existing loans default to `"[]"`

## Risk
- Low: SQLite handles String fields well, no FK constraint needed
