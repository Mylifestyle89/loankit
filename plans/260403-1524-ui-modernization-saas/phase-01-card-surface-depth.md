---
phase: 1
priority: high
status: pending
effort: low
---

# Phase 1: Card & Surface Depth

## Overview
Nâng cấp card/panel từ flat border → layered shadow depth. Bigtech benchmark: Linear, Vercel dashboard cards.

## Current Pattern (tìm thấy khắp codebase)
```
rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#161616] shadow-sm
```

## Target Pattern
```
rounded-2xl border border-zinc-100 dark:border-white/[0.06]
bg-white dark:bg-[#161616]
shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.03)]
dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]
```

## Implementation Steps

### 1. Add utility classes to globals.css
Thêm reusable classes thay vì sửa từng component:
```css
/* Premium card surfaces */
.surface-card {
  @apply rounded-2xl border border-zinc-100 dark:border-white/[0.06]
         bg-white dark:bg-[#161616]
         shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.03)]
         dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)];
}
.surface-card-interactive {
  @apply surface-card transition-shadow duration-300
         hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.04)]
         dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_4px_16px_rgba(0,0,0,0.3)];
}
```

### 2. Update high-visibility cards
- Loan detail hero card (`loans/[id]/page.tsx`)
- Summary cards (disbursement, collateral totals)
- Customer info cards
- Doc checklist panels

### 3. Update sidebar surface
```
bg-white/90 backdrop-blur-xl → bg-white/95 backdrop-blur-2xl
border-slate-200/50 → border-zinc-100/80 dark:border-white/[0.05]
```

## Todo
- [ ] Add surface-card utility classes to globals.css
- [ ] Update loan detail hero card
- [ ] Update summary stat cards
- [ ] Update sidebar surface
- [ ] Verify dark mode contrast

## Success Criteria
- Cards have visible depth (not flat)
- Dark mode: subtle glow border instead of harsh border
- No layout shift from shadow changes
