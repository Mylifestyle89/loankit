# Brainstorm: Phản biện Review KHCN của Gemini 3.1 Pro

**Date:** 2026-03-25
**Status:** Closed — ghi nhận, không action

---

## Context

Gemini 3.1 Pro review module KHCN đưa ra 4 đề xuất. Claude phân tích lại dựa trên code scout thực tế.

## KHCN Module Hiện Tại

- **Frontend:** 5 file TSX (layout passthrough + 3 customer pages + 1 redirect)
- **Backend:** 15 service files (builders, registry, helpers, loaders)
- **Mapping/Template/AI Suggest UI:** Không tồn tại
- **Loan plans route:** Không tồn tại (nhưng service builder có)

## Đánh Giá Từng Đề Xuất

### 1. "Đồng bộ Layout Tabs như KHDN" — ❌ YAGNI

KHCN không có mapping/template/ai-suggest. Thêm 4 tabs dẫn đến 3 route rỗng. Layout passthrough hiện tại đúng cho scope.

### 2. "Nhân bản Mapping & Template" — ❌ Feature request, không phải code review

KHCN đã có 15 backend services xử lý report. Cần product-level decision trước khi build mapping UI. Chưa có evidence user cần feature này.

### 3. "Dọn dẹp /report/customers" — ❌ Nguy hiểm

`/report/customers/` chứa shared components (khcn-doc-checklist.tsx, khcn-profile-card.tsx, khcn-placeholder-panel.tsx) dùng bởi CustomerDetailView. Xóa sẽ break production.

### 4. "Kiểm tra Loan Plans route" — ⚠️ Hợp lý nhưng cần scope

Route `/khcn/customers/[id]/loan-plans/` chưa tồn tại. Service `khcn-builder-loan-plan.ts` có. Có thể đang render qua customer detail view, không nhất thiết cần route riêng.

## Verdict

**2/4 vi phạm YAGNI, 1/4 sẽ break production, 1/4 cần xác nhận scope.** Review của Gemini trộn lẫn feature request với code review — không nên follow as-is.

**Score KHCN module:** 8/10 — Clean, lightweight, đúng trách nhiệm cho scope hiện có.
