# Phase 2: Profile Card Stats

## Context
- [khcn-profile-card.tsx](../../src/app/report/customers/[id]/components/khcn-profile-card.tsx) — 104 lines
- [customer-summary-cards.tsx](../../src/app/report/customers/[id]/components/customer-summary-cards.tsx) — summary data

## Overview
- **Priority**: P2
- **Status**: pending
- **Effort**: 30m
- **Dependencies**: None (independent)

Add "Tong TSBD" and "Tong NVBD" stats to KHCN profile card. Tinh tu ALL collaterals cua customer (khong filter theo loan).

## Key Insights
- `KhcnProfileCard` nhan `summary` prop tu parent page
- Parent page fetch summary data tu API — can them 2 fields
- `collaterals` already loaded in customer query — chi can aggregate

## Requirements
- Profile card hien thi: "Tong TSBD" = SUM(collaterals.total_value), "Tong NVBD" = SUM(collaterals.obligation)
- Data tinh tu ALL collaterals cua customer, khong filter theo loan
- Format VND voi `formatVND()`

## Files to Modify

| File | Change |
|------|--------|
| `src/app/report/customers/[id]/components/khcn-profile-card.tsx` | Add 2 StatBadge |
| Parent page hoac API that provides summary | Add totalCollateralValue + totalObligation |

## Implementation Steps

1. **Find summary data source** — Grep for where `KhcnProfileCard` is used, trace summary prop origin. Likely from an API route that queries customer + aggregates.

2. **Add aggregate fields** — In the API/page that computes summary, add:
   ```ts
   totalCollateralValue: collaterals.reduce((s, c) => s + (c.total_value ?? 0), 0),
   totalObligation: collaterals.reduce((s, c) => s + (c.obligation ?? 0), 0),
   ```

3. **Update type** — In `KhcnProfileCardProps.summary`, add:
   ```ts
   totalCollateralValue: number;
   totalObligation: number;
   ```

4. **Add StatBadges** — In Row 3 of profile card, add after existing badges:
   ```tsx
   <StatBadge label="Tong TSBD" value={`${formatVND(summary.totalCollateralValue)} d`} />
   <StatBadge label="Tong NVBD" value={`${formatVND(summary.totalObligation)} d`} />
   ```

5. **Compile check**.

## Todo
- [ ] Trace summary data source (API/page)
- [ ] Add totalCollateralValue + totalObligation to summary
- [ ] Update KhcnProfileCardProps type
- [ ] Add 2 StatBadge to profile card
- [ ] Compile check

## Success Criteria
- Profile card shows "Tong TSBD" and "Tong NVBD" with VND format
- Values sum from ALL customer collaterals
- No regression on existing stats
