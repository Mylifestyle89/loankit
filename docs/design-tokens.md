---
title: Design tokens — banking tool color system
description: Hybrid color strategy (Q1=C from plans/260507-1615-banking-ui-ux-fixes/) — emerald primary banking trust + cam brand accent Claude personality
created: 2026-05-07
---

# Design tokens

## Color philosophy — Hybrid (locked 2026-05-07)

| Role | Color | Use cases |
|---|---|---|
| **Primary** (emerald) | `#059669` (primary-600) | Sidebar active, links, navigation, primary buttons, trust signals, badges nhóm 1 |
| **Brand/Accent** (cam) | `#DA7756` (brand-500) | Special actions: Tạo BCĐX, AI features, Claude-style highlights, branded CTAs |
| **Danger** | `#DC2626` (red-600) | Destructive actions, errors, debt group 5 (NPL severe) |
| **Warning** | `#D97706` (amber-600) | Pending states, debt group 2-4 |
| **Success** | `#10B981` (primary-500) | Confirmations, debt group 1 (matches primary spectrum) |

## Token definitions

CSS custom properties in `src/app/globals.css` `@theme inline { ... }` block:

- `--color-primary-{50..950}` — emerald scale
- `--color-brand-{50..950}` — cam scale (Terra Cotta, Claude-inspired)
- `--color-amber-*`, `--color-violet-*`, etc — supporting palettes

## Tailwind utility usage

| Want | Use | NOT |
|---|---|---|
| Primary button | `bg-primary-600 hover:bg-primary-700 text-white` | `bg-brand-500` (đó là accent, không phải primary) |
| Active nav item | `bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300` | `bg-brand-100 text-brand-600` |
| Special CTA "Tạo BCĐX" | `bg-brand-500 hover:bg-brand-600 text-white` | `bg-primary-600` (mất personality) |
| Danger button | `bg-red-600 hover:bg-red-700 text-white` | `bg-brand-500` (cam quá gần red, gây confuse) |

## Light mode (banking-neutral)

- `--bg-base: #F8FAFC` (slate-50, cool neutral) — replaced previous warm cream `#FAF8F5`
- `--surface: #FFFFFF`
- `--text-1: #0F172A` (slate-900)
- `--text-2: #475569` (slate-600, ≥4.5:1 contrast on white)

## Dark mode (Claude warm — kept)

- `--bg-base: #262624` matches claude.ai
- Warm cream text on warm dark surface — established aesthetic, no change

## Migration log

- 2026-05-07: Q1=C (Hybrid) locked. Light mode bg slate. Sidebar active brand → primary.
- Phase 2 sweep ongoing — components still using `brand-*` for navigation/active should switch incrementally.

## When to use which?

```
Is it a special branded action (Tạo BCĐX, AI Suggest, Claude feature)?
  → brand-* (cam)

Is it navigation, link, or trust-signal action (login, save, primary CTA)?
  → primary-* (emerald)

Is it destructive (delete, reject, error)?
  → red-* (red, NEVER brand)
```

## Audit checklist

When touching a component:

- [ ] If `bg-brand-*` is on a button: is it a "special action"? If not, swap → `bg-primary-*`
- [ ] If `text-brand-*` is on a link/nav: swap → `text-primary-*`
- [ ] If error display: ensure `text-rose-*` or `text-red-*`, never `text-brand-*`
- [ ] Active states use primary, not brand
