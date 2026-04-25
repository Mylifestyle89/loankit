---
title: "Multi-Collateral Loan Selection"
description: "Cho phep user chon tai san bao dam cho tung khoan vay, profile card hien thi tong, report filter theo selection"
status: complete
priority: P1
effort: 3h
branch: main
tags: [khcn, collateral, loan, report]
created: 2026-03-31
---

# Multi-Collateral Loan Selection

## Problem

KHCN generate bo HD the chap dung TAT CA collaterals cua customer. Can cho user chon tai san nao dua vao tung khoan vay.

## Solution Overview

1. **DB**: Add `selectedCollateralIds` JSON field to Loan model
2. **Profile Card**: Hien thi "Tong TSBD" + "Tong NVBD" tu ALL collaterals
3. **Collateral Picker UI**: Checkbox selection trong loan detail page
4. **Report Service Filter**: Filter collaterals by selectedIds truoc khi build data

## Phases

| # | Phase | Effort | Status |
|---|-------|--------|--------|
| 1 | [DB Migration + API](./phase-01-db-migration-api.md) | 30m | ✅ |
| 2 | [Profile Card Stats](./phase-02-profile-card-stats.md) | 30m | ✅ |
| 3 | [Collateral Picker UI](./phase-03-collateral-picker-ui.md) | 1.5h | ✅ |
| 4 | [Report Service Filter](./phase-04-report-service-filter.md) | 30m | ✅ |

## Key Dependencies

- Phase 3 depends on Phase 1 (API must accept selectedCollateralIds)
- Phase 4 independent (only touches report service)
- Phase 2 independent (only touches profile card)

## Architecture

```
Loan.selectedCollateralIds (JSON string) --> API PATCH /api/loans/[id]
     |
     v
Loan Detail Page --> Collateral Picker --> save selectedCollateralIds
     |
     v
khcn-report.service.ts --> filter c.collaterals by selectedIds --> builders
```
