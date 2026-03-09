# Plan: Gộp Template + Runs thành 1 page, 3 sub-tabs

## Overview
- **Priority:** Medium
- **Status:** Complete
- **Complexity:** Medium (refactor 2 pages → 1 page + 3 tab components)
- **Phases:** 3
- **Brainstorm:** `plans/reports/brainstorm-260309-0918-merge-template-runs-tabs.md`

## Summary
Gộp `/report/template` và `/report/runs` thành 1 page duy nhất với 3 sub-tabs:
1. **Chỉnh sửa mẫu** — template editor, field injection (từ configured tab hiện tại)
2. **Duyệt folder** — folder browser, field reference (giữ nguyên)
3. **Build & Export** — build data, export/preview, run logs (từ runs page)

Template selector + editor toggle đặt ở header chung. URL sync qua `?tab=`.

## Architecture
```
page.tsx (shared state + header + tab router + modals)
  ├─ ConfiguredTemplatesTab (edit, inject fields)
  ├─ FolderBrowserTab (existing, pass new props)
  └─ BuildExportTab (build, export, run logs)
```

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Extract ConfiguredTemplatesTab + create BuildExportTab | Complete | [phase-01](phase-01-extract-tab-components.md) |
| 2 | Refactor page.tsx → unified page with 3 tabs | Complete | [phase-02](phase-02-refactor-page.md) |
| 3 | Redirect runs + update sidebar + cleanup | Complete | [phase-03](phase-03-redirect-cleanup.md) |

## Success Criteria
- [x] 1 page, 3 sub-tabs hoạt động đúng
- [x] URL `?tab=configured|folder|export` sync
- [x] `/report/runs` redirect → `/report/template?tab=export`
- [x] Sidebar bỏ entry "Runs"
- [ ] Mỗi file ≤ 150 LOC (page.tsx ~178 LOC, build-export-tab ~160 LOC — cần minor refactor)
- [x] TypeScript compile pass
- [x] Tất cả chức năng giữ nguyên (0 regression)
