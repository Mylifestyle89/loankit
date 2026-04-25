---
status: pending
created: 2026-04-03
branch: main
---

# Plan: UI Modernization — Bigtech SaaS Look

## Objective
Nâng cấp UI từ "functional" lên "premium SaaS" (Linear, Vercel, Stripe level) qua CSS/component tweaks. Không thay đổi logic hay data flow.

## Context
- Brainstorm: `plans/reports/brainstorm-260402-1803-merge-khcn-template-buttons.md` (UI section)
- Design system: Soft UI Evolution + Glassmorphism hybrid
- Stack: Next.js + Tailwind CSS + Lucide icons (đã có)
- Font: Inter + Geist Sans (đã có, OK)

## Phases

| # | Phase | Priority | Effort | Impact | Status | File |
|---|-------|----------|--------|--------|--------|------|
| 1 | Card & Surface depth | High | Low | High | pending | [phase-01](phase-01-card-surface-depth.md) |
| 2 | Sidebar nav polish | High | Low | High | pending | [phase-02](phase-02-sidebar-nav-polish.md) |
| 3 | Micro-interactions | Medium | Low | High | pending | [phase-03](phase-03-micro-interactions.md) |
| 4 | Typography & spacing | Medium | Low | Medium | pending | [phase-04](phase-04-typography-spacing.md) |

## Scope
CSS-only changes + minor component tweaks. NO new dependencies. NO logic changes.

## Key Files
- `src/app/globals.css` — design tokens, global styles
- `src/app/report/layout.tsx` — sidebar, main shell
- Components scattered across `src/app/report/**/` — card patterns

## Anti-patterns to avoid
- Excessive animation (> 300ms)
- Dark mode by default (keep user preference)
- Over-glassmorphism (readability over aesthetics)
