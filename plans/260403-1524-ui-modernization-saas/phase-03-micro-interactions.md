---
phase: 3
priority: medium
status: pending
effort: low
---

# Phase 3: Micro-interactions

## Overview
Thêm subtle animations cho buttons, cards, modals. Benchmark: Stripe, Notion.

## Implementation Steps

### 1. Button hover glow (CTA buttons only)
```css
.btn-glow:hover {
  box-shadow: 0 0 20px rgba(124, 58, 237, 0.25);
  transform: translateY(-1px);
  transition: all 200ms var(--ease-out);
}
```
Apply cho gradient buttons (from-violet-600 to-fuchsia-600).

### 2. Interactive card lift
```css
.card-lift {
  transition: transform 200ms var(--ease-out), box-shadow 300ms var(--ease-out);
}
.card-lift:hover {
  transform: translateY(-2px);
}
```
Apply cho: collateral cards, template rows, customer list items.

### 3. Focus-visible glow ring
```css
.focus-glow:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--bg-base), 0 0 0 4px rgba(99, 102, 241, 0.5);
}
```

### 4. Reduced motion respect
```css
@media (prefers-reduced-motion: reduce) {
  .btn-glow:hover, .card-lift:hover {
    transform: none;
  }
}
```

## Todo
- [ ] Add utility classes to globals.css
- [ ] Apply btn-glow to gradient CTA buttons
- [ ] Apply card-lift to interactive cards
- [ ] Add focus-glow to form inputs
- [ ] Add prefers-reduced-motion guard
- [ ] Test across light/dark modes

## Success Criteria
- Buttons feel "alive" on hover (subtle glow + lift)
- Cards have depth on hover
- All animations < 300ms
- Reduced motion users get no transform animations
