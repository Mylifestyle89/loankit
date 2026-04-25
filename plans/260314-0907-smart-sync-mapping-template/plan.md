---
status: completed
branch: KHCN-implement
created: 2026-03-14
brainstorm: plans/reports/brainstorm-260314-0907-merge-field-template-tabs.md
---

# Smart Sync: Mapping ↔ Template

## Problem
User switch liên tục giữa Mapping & Template page. Mất context vì không biết field nào thiếu data, field nào template đang dùng.

## Solution
Giữ 2 trang riêng, thêm sync thông minh: coverage indicator, field validation, quick navigation, reverse sync.

## Key Findings
- Placeholder format: `[field_key]` (square brackets, flat key with dots)
- Template validation API đã có: `/api/report/template/validate-upload` → `valid[]`, `unknown[]`, `missing[]`
- Freshness check đã có: `/api/report/freshness` → `is_stale` + `reasons[]`
- Field data: `effectiveValues` = auto + manual + formula (from `use-mapping-data-store`)
- Shared `field_catalog` từ FieldTemplate giữa 2 trang

## Phases

| # | Phase | Status | Effort | File |
|---|-------|--------|--------|------|
| 1 | Field Coverage Indicator | ✅ | Low | [phase-01](phase-01-field-coverage-indicator.md) |
| 2 | Template Field Validation UI | ✅ | Medium | [phase-02](phase-02-template-field-validation.md) |
| 3 | Quick Navigation | ✅ | Low | [phase-03](phase-03-quick-navigation.md) |
| 4 | Reverse Sync (Mapping → Template) | ✅ | Medium | [phase-04](phase-04-reverse-sync.md) |

## Dependencies
- Phase 2 depends on Phase 1 (reuse coverage logic)
- Phase 3 depends on Phase 2 (navigation targets from validation)
- Phase 4 independent, can parallel with Phase 2-3

## Architecture
No new stores. Extend existing stores + add shared utility.

```
src/lib/report/field-sync-utils.ts  ← NEW: shared logic
  ├── computeFieldCoverage(catalog, values) → { total, filled, empty, coverage% }
  └── extractPlaceholders(templateContent) → string[]

Mapping page: extend MappingStatusBar + FieldRow
Template page: extend configured-templates-tab + build-export-tab
```
