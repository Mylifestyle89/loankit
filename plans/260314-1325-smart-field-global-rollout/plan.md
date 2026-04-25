---
title: "SmartField Global Rollout"
description: "Expand SmartField to all KHCN text fields with batch loading, namespace prefixes, and seed data"
status: pending
priority: P1
effort: 3h
branch: KHCN-implement
tags: [khcn, smart-field, ux, performance]
created: 2026-03-14
---

# SmartField Global Rollout

## Goal
Mở rộng SmartField ra toàn bộ text fields trong KHCN customer module. User tự quyết field nào cần dropdown.

## Key Decisions
- Namespace: `{section}.{field_key}` (e.g., `collateral.certificate_name`)
- UX: Ẩn nút [+] mặc định, hover mới hiện; ListPlus icon luôn hiện khi có options
- Batch fetch: `useDropdownOptionsGroup(prefix)` - 1 API call/section thay vì N calls
- Seed ~10 field phổ biến với dropdown options
- SmartField chỉ cho text fields, giữ plain input cho number/date

## Phases

| # | Phase | Effort | Status |
|---|-------|--------|--------|
| 1 | [SmartField Enhancement & Batch Hook](./phase-01-smart-field-enhancement.md) | 1h | pending |
| 2 | [Data Migration & Seed](./phase-02-data-migration-seed.md) | 30m | pending |
| 3 | [Integrate SmartField into All Sections](./phase-03-integrate-all-sections.md) | 1.5h | pending |

## Dependencies
- Phase 2 depends on Phase 1 (batch hook needed for context provider)
- Phase 3 depends on Phase 1 (enhanced SmartField + context provider)
- Phase 2 and 3 can run in parallel after Phase 1

## Risk
| Risk | Mitigation |
|---|---|
| Breaking existing branch-staff dropdowns | Migration renames flat keys to prefixed |
| N+1 API calls per section | Batch hook + context provider |

## Brainstorm Report
- [brainstorm-260314-1320-smart-field-global-rollout.md](../reports/brainstorm-260314-1320-smart-field-global-rollout.md)
