---
status: pending
created: 2026-04-05
slug: tsbd-land-detail-import-rounding
---

# TSBĐ: Land Detail Import + Valuation Rounding

## Overview
2 features cho phần TSBĐ (Collateral) trong KHCN module:
1. BK import chi tiết định giá đất (3 loại đất + diện tích riêng)
2. Làm tròn xuống giá trị định giá (đất + nhà, dropdown riêng biệt)

## Phases

| # | Phase | Status | Files | Effort |
|---|-------|--------|-------|--------|
| 1 | BK mapping + extract | ⬜ | 2 files | S |
| 2 | Rounding logic + UI | ⬜ | 3 files | M |

## Phase Details

### Phase 1: BK Import Chi Tiết Đất
→ [phase-01-bk-land-detail-import.md](phase-01-bk-land-detail-import.md)

### Phase 2: Valuation Rounding
→ [phase-02-valuation-rounding.md](phase-02-valuation-rounding.md)

## Dependencies
- Phase 2 independent of Phase 1 (no blockers)

## Context
- Brainstorm: `plans/reports/brainstorm-260405-2254-tsbd-land-detail-import-rounding.md`
