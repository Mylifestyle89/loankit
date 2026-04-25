# Brainstorm: KHCN Template Management (Download/Upload)

**Date:** 2026-03-31 | **Status:** Agreed

## Problem

KHCN templates read-only (hardcoded registry). User muốn sửa mẫu DOCX trên bản deploy.

## Chosen Approach: Reuse KHDN Infrastructure

- Tab mới "Quản lý mẫu" trong trang KHCN
- Tải về DOCX template
- Tải lên thay thế (overwrite file)
- Reuse API: `save-docx`, `folder-files` từ KHDN module
- Auto-backup khi replace (đã có trong `saveDocxWithBackup`)

## Scope

| Feature | Included |
|---------|----------|
| Download template | ✅ |
| Upload replace | ✅ |
| Auto-backup | ✅ (existing) |
| Web editor | ❌ (YAGNI) |
| Validate placeholder | ❌ (YAGNI) |

## Implementation

1. Tab "Quản lý mẫu" trong /report/khcn page
2. List KHCN templates từ registry (65+ mẫu, grouped by category)
3. Download button → serve file từ FS
4. Upload button → PUT `/api/report/template/save-docx?path=...` (existing API)
5. Reuse `template-file-actions.tsx` components từ KHDN

## Key Reuse

- API `save-docx` đã handle backup + path validation
- `folder-files` API scan bất kỳ path trong report_assets/
- KHCN registry đã có full path metadata

## Risk

- Vercel: filesystem read-only → upload chỉ hoạt động trên local/self-hosted
- Mitigation: hiện warning trên Vercel, hoặc commit file mới qua git
