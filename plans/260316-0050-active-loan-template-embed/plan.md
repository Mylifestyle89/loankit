---
status: pending
branch: KHCN-implement
created: 2026-03-16
---

# Plan: Active Loan Selection & Template Placeholder Audit

## Overview
Thêm dropdown chọn HĐTD active trong UI doc checklist, audit builder vs template placeholders, bổ sung missing fields.

## Phases

### Phase 1: Active Loan Selection UI ⬜
- File: `src/app/report/customers/[id]/components/khcn-doc-checklist.tsx`
- Thêm dropdown "Chọn HĐTD" hiển thị danh sách khoản vay của customer
- Truyền `loanId` vào API generate khi xuất template
- Default = khoản vay đầu tiên (giữ backward compat)

### Phase 2: Placeholder Audit & Gap Fill ⬜
- Scan tất cả placeholder trong 2 template PA & BCĐX
- Cross-check với builder `khcn-report-data-builders.ts`
- Bổ sung các placeholder chưa được fill:
  - `[PA.Số sào đất]`, `[PA.Địa chỉ đất NN]`
  - `[HĐTD.Lãi suất chậm trả]`, `[HĐTD.Lãi suất quá hạn]`
  - `[HĐTD.Tài chính minh bạch, LM]`
  - `[HĐTD.TGTTSBĐ bằng chữ]`, `[HĐTD.TNVBĐTĐ bằng chữ]`
  - Các field TSBĐ chi tiết trong BCĐX (Diện tích đất, Số thửa, etc.)

### Phase 3: Compile & Test ⬜
- TypeScript compile check
- Test generate cả 2 template với data thật

## Key Files
- `src/app/report/customers/[id]/components/khcn-doc-checklist.tsx` — UI
- `src/services/khcn-report-data-builders.ts` — Builder
- `src/lib/report/khcn-placeholder-registry.ts` — Registry
- `src/app/api/report/templates/khcn/generate/route.ts` — API
