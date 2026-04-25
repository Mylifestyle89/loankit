---
status: completed
branch: KHCN-implement
created: 2026-03-19
completed: 2026-03-19
---

# Plan: Gộp Mapping + Template + AI vào Tab KHDN

## Brainstorm
- [brainstorm-260319-0904-khdn-tab-consolidation.md](../reports/brainstorm-260319-0904-khdn-tab-consolidation.md)

## Summary
Gộp 3 modules KHDN (Mapping, Template, AI Suggestion) vào route group `/report/khdn/*` với sub-tab navigation. Navbar giảm từ 7 → 5 items.

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | Tạo KHDN layout + sub-tabs | ✅ | S |
| 2 | Move mapping + template routes | ✅ | M |
| 3 | Update navbar + AI button | ✅ | S |
| 4 | Fix cross-references + imports | ✅ | M |
| 5 | Verify + cleanup | ✅ | S |

## Key Decisions
- Giữ API routes tại `/api/report/mapping/*` và `/api/report/template/*` — không move
- Giữ stores/hooks tại vị trí cũ hoặc move cùng mapping — tuỳ phase 2
- KHCN giữ trong Customers page
- `GlobalModalProvider` giữ ở report layout level
