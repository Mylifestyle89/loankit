# Brainstorm: Dashboard Landing Page

**Date:** 2026-04-04 | **Status:** Approved for implementation

## Problem
After login, user lands on KHDN field editor — confusing and not professional. Need a proper dashboard/landing page.

## Decision
Full dashboard with Apple-minimal style. No recent activity (YAGNI — no activity tracking yet).

## Components
1. **Hero greeting** — "Xin chào, {name}" + current date
2. **3 stat cards** — Total customers, total loans, pending invoices (real counts from DB)
3. **4 module cards** — KHCN, KHDN, Tài chính, Chứng từ → click = navigate
4. **Footer** — Loankit version + branding

## Design
- Apple minimal: white/dark bg, generous whitespace, strong typography
- Colors: keep existing violet accent, zinc borders
- Cards: rounded-2xl, subtle shadow, hover scale effect
- Stats: large numbers, small labels
- Dark mode supported

## Layout (ASCII)
```
Hero greeting + date
[Stat 1] [Stat 2] [Stat 3]
[KHCN card]  [KHDN card]
[Loans card] [Invoices card]
Footer
```

## Implementation
- Replace `src/app/report/page.tsx` (currently just redirect)
- Create dashboard component with server-side data fetching (stats)
- Update `DEFAULT_CALLBACK` in auth-utils to `/report`
- API: `/api/dashboard/stats` for counts (or inline server component)

## Files to Change
- `src/app/report/page.tsx` — replace redirect with dashboard
- `src/lib/auth-utils.ts` — update DEFAULT_CALLBACK to `/report`
- New: dashboard stat fetching (server component or API)
