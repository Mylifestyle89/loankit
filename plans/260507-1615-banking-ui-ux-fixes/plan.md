---
title: "UI/UX cải thiện banking tool"
description: "Fix production bugs (NaN, Failed to load, sidebar ARIA), review brand color (cam Claude vs emerald banking), neutralize light mode, format consistency"
status: pending
priority: P1
effort: 2-3d (phase 1-4) + 1d (phase 5 optional)
branch: main
created: 2026-05-07
context: "Other Claude Opus session reviewed UI scoring 6.5/10. Re-evaluated → 5.5/10 vì có production bugs. Plan addresses 80% review's findings + 5 banking-specific gaps."
---

# UI/UX cải thiện banking tool

## Goals

1. **Stop bleeding** — fix production bugs đang ship (NaN, Failed to load, sidebar ARIA)
2. **Re-anchor brand** — quyết định màu primary (cam #E8453C giữ vs emerald #059669 banking-aligned)
3. **Banking polish** — light mode neutral, currency format đồng nhất, loading states
4. **Defer-able** — tab flatten + language consistency (big refactors)

## Phases

| # | File | Status | Effort | Blocking |
|---|---|---|---|---|
| 01 | [phase-01-critical-bug-fixes.md](phase-01-critical-bug-fixes.md) | pending | 4-6h | none |
| 02 | [phase-02-brand-color-and-light-mode.md](phase-02-brand-color-and-light-mode.md) | pending — needs UX decision | 1-2d | UX decision Q1 |
| 03 | [phase-03-format-consistency.md](phase-03-format-consistency.md) | pending | 4-6h | none |
| 04 | [phase-04-loading-empty-states.md](phase-04-loading-empty-states.md) | pending | 6-8h | phase 02 |
| 05 | [phase-05-tab-flatten-language.md](phase-05-tab-flatten-language.md) | deferred | 2-3d | optional |

## Non-goals

- Visual redesign full app (out of scope, P3)
- Mobile responsive overhaul (banking tool desktop-first)
- New components/features (chỉ fix existing)
- Animation polish (defer cho sau)

## Success criteria

- 0 `NaN` rendering trong production UI
- 0 raw error string visible to user without retry path
- Light mode contrast ≥4.5:1 (WCAG AA)
- Brand color decision documented + applied consistently
- Currency format: `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })` everywhere
- Skeleton loading states cho table + detail page
- Empty states cho zero-data scenarios

## Risks

- **Brand color flip** (nếu chọn emerald) → ~50 component touchpoints. Mitigation: Tailwind tokens, single source of truth (`tailwind.config.ts` colors). Effort medium nếu đã centralized.
- **Currency format swap** → cần audit toàn bộ display points, có thể break copy/paste workflows nếu user đã quen format cũ
- **Tab flatten (phase 5)** → high regression risk, có thể break user muscle memory. Defer.

## Open questions (sẽ ask trong phase 2)

- Q1: Brand color — keep cam #E8453C hay switch emerald hay hybrid?
- Q2: Có dùng skeleton library (vd `react-loading-skeleton`) hay tự code Tailwind?
- Q3: Empty state illustrations — tự draw SVG hay icon-only?

## References

- Other Opus review (full transcript trong session 2026-05-07)
- Skill: `ui-ux-pro-max` rule reference (color-contrast, error-feedback, aria-labels, loading-states)
- Memory: `project_agribank_pii_compliance.md` (Agribank context)
