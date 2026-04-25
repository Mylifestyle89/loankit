---
phase: 4
priority: medium
status: pending
effort: low
---

# Phase 4: Typography & Spacing

## Overview
Tăng weight contrast cho headings, cải thiện muted text readability.

## Implementation Steps

### 1. Heading weight hierarchy in globals.css
```css
h1 { font-weight: 800; letter-spacing: -0.03em; }
h2 { font-weight: 700; letter-spacing: -0.02em; }
h3 { font-weight: 600; letter-spacing: -0.015em; }
```

### 2. Muted text improvement
Current `text-zinc-400` (light) quá nhạt. Đổi thành:
- Light mode muted: `text-zinc-500` (minimum)
- Dark mode muted: `text-slate-400` (giữ nguyên, OK)

### 3. Page section spacing
Thống nhất spacing giữa sections: `space-y-6` thay vì mix `space-y-4` / `space-y-5`.

## Todo
- [ ] Update heading styles in globals.css
- [ ] Audit muted text contrast (zinc-400 → zinc-500)
- [ ] Standardize section spacing

## Success Criteria
- Headings có visual weight rõ ràng
- Muted text readable trên white background
- Spacing consistent across pages
