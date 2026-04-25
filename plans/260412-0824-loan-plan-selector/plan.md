# Plan: Loan Plan Selector khi tạo hợp đồng vay

**Ngày**: 2026-04-12  
**Status**: pending  
**Branch**: main

## Mục tiêu

1. Thêm tab "Phương án" riêng trên Customer detail (KHCN + KHDN)
2. Modal chọn phương án trước khi tạo khoản vay mới
3. Thêm FK `loanPlanId` vào Loan model (nullable, backward compat)
4. Xóa button "Phương án vay vốn" khỏi loan-detail-header

## Phát hiện quan trọng từ scout

- **New loan form ĐÃ đọc `?planId`** → auto-fill từ plan (lines 39-52 `/report/loans/new/page.tsx`)
- **Loan form chưa lưu `loanPlanId`** → chỉ cần thêm field vào schema + POST handler
- **Tab config** tại `src/components/customers/customer-detail-tabs-config.ts`
- "Phương án vay vốn" button tại `loan-detail-header.tsx` line 59-65

## Phases

| Phase | Mô tả | Effort |
|-------|-------|--------|
| [01](phase-01-schema.md) | DB schema + migration | ~30 min |
| [02](phase-02-modal.md) | Modal selector + button hook | ~1 hr |
| [03](phase-03-tab.md) | Tab "Phương án" trên Customer | ~30 min |
| [04](phase-04-cleanup.md) | Cleanup + loanPlanId in form/API | ~30 min |

## Files bị ảnh hưởng

| File | Phase | Thay đổi |
|------|-------|---------|
| `prisma/schema.prisma` | 01 | +loanPlanId nullable + relation |
| `prisma/migrations/` | 01 | migration file |
| `src/app/api/loans/route.ts` | 01 | +loanPlanId to zod schema |
| `src/components/customers/customer-detail-tabs-config.ts` | 03 | +tab "Phương án" |
| `src/app/report/customers/[id]/components/customer-loans-section.tsx` | 02 | button → modal trigger |
| `src/app/report/customers/[id]/components/loan-plan-selector-modal.tsx` | 02 | **NEW** |
| `src/app/report/loans/new/page.tsx` | 04 | lưu loanPlanId khi submit |
| `src/app/report/loans/[id]/components/loan-detail-header.tsx` | 04 | xóa button Phương án |

## Không thay đổi

- `/report/customers/[id]/loan-plans/` — trang loan-plans giữ nguyên (tab trỏ vào đây)
- Logic auto-fill trong `new/page.tsx` — đã hoạt động
- API GET `/api/loan-plans` — đã đủ để dùng trong modal
