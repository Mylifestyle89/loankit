---
title: Disbursement Field Suggestions / Autocomplete
status: complete
created: 2026-04-03
completed: 2026-04-03
branch: main
---

# Disbursement Field Suggestions

Thêm suggestion dropdown cho 3 trường lặp lại trong form "Thêm/Sửa giải ngân":
- `principalSchedule` (Định kỳ trả gốc)
- `interestSchedule` (Định kỳ trả lãi)
- `purpose` (Mục đích)

Suggestions lấy từ DB — DISTINCT values từ tất cả giải ngân của cùng **customer** (per-customer scope).

## Approach

DB-backed suggestions dropdown (Approach B):
- 1 API endpoint mới → 1 service method mới
- 1 generic `SuggestInput` component (reuse pattern beneficiary autocomplete)
- Wire vào `DisbursementFormModal`
- Không thay đổi Prisma schema, không thêm thư viện

## Phases

| Phase | Mô tả | Status |
|-------|-------|--------|
| [01](phase-01-suggest-input-component.md) | `SuggestInput` generic component | complete |
| [02](phase-02-api-service.md) | API endpoint + service method | complete |
| [03](phase-03-wire-into-form.md) | Wire vào `DisbursementFormModal` | complete |

## Files tạo mới

- `src/components/suggest-input.tsx`
- `src/app/api/loans/[id]/disbursement-suggestions/route.ts`

## Files sửa

- `src/services/disbursement.service.ts` — thêm `getFieldSuggestions()`
- `src/components/invoice-tracking/disbursement-form-modal.tsx` — wire SuggestInput

## Dependencies

- Phase 01 → độc lập
- Phase 02 → độc lập
- Phase 03 → depends on 01 + 02
