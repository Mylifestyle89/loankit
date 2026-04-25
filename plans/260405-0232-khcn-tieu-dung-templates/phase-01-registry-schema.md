# Phase 1: Registry + Schema

**Priority:** High | **Status:** TODO | **Effort:** S

## Overview

Đăng ký templates tiêu dùng vào registry, thêm `income_source_type` vào schema, thêm `"tieu_dung"` vào BBKT methods.

## Files to Modify

- `src/lib/loan-plan/khcn-template-registry.ts` — thêm 3 template entries
- `src/lib/loan-plan/loan-plan-schemas.ts` — thêm `income_source_type` field
- `src/lib/loan-plan/loan-plan-constants.ts` — thêm `INCOME_SOURCE_OPTIONS`, labels

## Implementation Steps

### 1.1 Thêm templates vào registry

```ts
// khcn-template-registry.ts — thêm vào KHCN_TEMPLATES array

// BCĐX tiêu dùng (narrative: lương, cho thuê)
{ path: `${BASE}/Báo cáo đề xuất/2268.02A BCDXCV tieu dung co TSBD.docx`, 
  name: "BCĐX tiêu dùng có TSBĐ (2268.02A)", category: "bao_cao", methods: ["tieu_dung"] },

// BCĐX SXKD ngắn hạn đã có — thêm "tieu_dung" vào methods (dùng cho tabular)
// → Sửa entry hiện tại: methods: ["tung_lan"] → methods: ["tung_lan", "tieu_dung"]

// PASDV tiêu dùng
{ path: `${BASE}/Phương án sử dụng vốn/2268.01B PASDV vay phuc vu doi song co TSBD.docx`,
  name: "PA phục vụ đời sống có TSBĐ (2268.01B)", category: "phuong_an", methods: ["tieu_dung"] },
```

### 1.2 Thêm "tieu_dung" vào BBKT methods

```ts
// Sửa 2 entries hiện tại:
// BB kiểm tra SDVV: methods: ["tung_lan", "han_muc", "trung_dai"] → thêm "tieu_dung"
// BB kiểm tra HĐKD: methods: ["tung_lan", "han_muc"] → thêm "tieu_dung"
```

### 1.3 Thêm income_source_type vào schema

```ts
// loan-plan-schemas.ts
export const INCOME_SOURCE_TYPES = ["salary", "rental", "agriculture", "business"] as const;

// Thêm vào createPlanSchema:
income_source_type: z.enum(INCOME_SOURCE_TYPES).optional(),
```

### 1.4 Thêm constants

```ts
// loan-plan-constants.ts
export const INCOME_SOURCE_OPTIONS = [
  { value: "salary", label: "Lương" },
  { value: "rental", label: "Cho thuê nhà/mặt bằng" },
  { value: "agriculture", label: "Nông nghiệp" },
  { value: "business", label: "Kinh doanh" },
] as const;

export const INCOME_SOURCE_LABELS: Record<string, string> = {
  salary: "Lương",
  rental: "Cho thuê nhà/mặt bằng",
  agriculture: "Nông nghiệp",
  business: "Kinh doanh",
};
```

## Success Criteria

- [x] `getTemplatesForMethod("tieu_dung")` trả về BCĐX + PASDV + BBKT + chứng từ giải ngân
- [x] Schema validate `income_source_type` field
- [x] `tsc --noEmit` pass
