---
phase: 2
priority: high
status: pending
effort: low
---

# Phase 2: Sidebar Navigation Polish

## Overview
Nâng cấp sidebar active state + hover feedback cho cảm giác premium. Benchmark: Linear sidebar.

## Current Active State
```
bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400
```
Flat highlight, không có indicator rõ ràng.

## Target Active State
```
relative bg-indigo-50/80 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400
before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2
before:h-5 before:w-[3px] before:rounded-full before:bg-indigo-600
```
Pill indicator bên trái — giống Linear, Arc browser.

## Implementation Steps

### 1. Update nav link active state in layout.tsx
Thêm `before:` pseudo-element pill indicator cho active link.

### 2. Hover state improvement
```
/* Before */
hover:bg-slate-100/70

/* After — subtler, with slight scale */
hover:bg-zinc-50 dark:hover:bg-white/[0.04]
```

### 3. Brand logo area
Thêm subtle gradient line dưới brand:
```
after:absolute after:bottom-0 after:left-3 after:right-3
after:h-px after:bg-gradient-to-r after:from-transparent after:via-indigo-200 after:to-transparent
dark:after:via-indigo-500/20
```

## Todo
- [ ] Add pill indicator cho active nav link
- [ ] Update hover states
- [ ] Polish brand area divider
- [ ] Test collapsed + expanded states
- [ ] Test mobile sidebar

## Success Criteria
- Active page clearly indicated with left pill
- Hover feedback subtle but visible
- Works in both collapsed and expanded states
