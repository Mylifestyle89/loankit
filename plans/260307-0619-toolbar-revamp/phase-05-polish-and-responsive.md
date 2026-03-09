---
phase: 5
status: complete
priority: low
effort: S
completed: 2026-03-07
---

# Phase 5: Polish + Responsive + Dark Mode

## Overview
Final polish: responsive toolbar, consistent dark mode, keyboard accessibility.

## Implementation Steps

### 1. Responsive toolbar
- Toolbar buttons: `gap-1 md:gap-2` cho mobile
- Search row: `flex-wrap` cho mobile
- Button size: `p-2 md:p-2.5` cho mobile

### 2. Dark mode consistency
- Verify tat ca modal moi (CustomerPicker, TemplatePicker) co dark mode
- Check border, bg, text colors match design system:
  - Border: `border-zinc-200 dark:border-white/[0.08]`
  - Bg: `bg-white dark:bg-[#141414]`
  - Text: `text-zinc-900 dark:text-slate-100`

### 3. Keyboard accessibility
- Tab order: toolbar buttons -> search -> filters
- Focus ring: `focus-visible:ring-2 focus-visible:ring-violet-500/40`
- Escape closes modals (da co tu AnimatePresence pattern)

### 4. Active state indicators
- KH button: active khi `selectedCustomerId !== ""`
- Mau button: active khi `selectedFieldTemplateId !== ""`
- Sidebar button: active khi sidebar open

### 5. Toast cho BCTC
- Dung existing toast/notification pattern
- Message: "Xin hay chon khach hang truoc khi su dung Phan tich tai chinh"

## Todo
- [x] Responsive adjustments
- [x] Dark mode verification
- [x] Keyboard accessibility
- [x] Active state indicators
- [x] BCTC toast message
- [x] Final visual review

## Success Criteria
- Toolbar hien thi tot tren mobile (320px+)
- Dark mode consistent across tat ca components
- Tab navigation hoat dong dung
- Active states hien thi chinh xac
