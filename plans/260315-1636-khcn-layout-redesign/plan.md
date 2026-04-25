---
title: "KHCN Customer Detail Page Layout Redesign"
description: "Replace summary cards with profile card and reduce tabs from 6 to 4 for KHCN customers"
status: complete
priority: P2
effort: 3h
branch: KHCN-implement
tags: [khcn, ui, layout, refactoring]
created: 2026-03-15
completed: 2026-03-15
---

# KHCN Customer Detail Page Layout Redesign

## Goal
Redesign the individual (KHCN) customer detail page: compact profile card replaces 8 summary cards, merge 6 tabs into 5. DN layout stays 100% unchanged.

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | Backend: add computed fields to `getFullProfile` | complete | 0.5h |
| 2 | Frontend: profile card + conditional tab layout | complete | 2.5h |

## Key Decisions
- No DB migration needed: debt_group already on Loan model, endDate = maturity, co-borrower count from relation
- Computed fields added to existing `summary` object in `getFullProfile` response
- New component: `khcn-profile-card.tsx` (~80 lines)
- page.tsx gets conditional `allTabs` vs `khcnTabs` based on `customer_type`
- Merged tab "Khoan vay & Tin dung" uses subtabs pattern already established in info tab

## Files Changed
- `src/services/customer.service.ts` — extend summary computation
- `src/app/report/customers/[id]/page.tsx` — conditional tabs + profile card
- `src/app/report/customers/[id]/components/khcn-profile-card.tsx` — NEW
- `src/app/report/customers/[id]/components/customer-summary-cards.tsx` — unchanged (DN still uses)
