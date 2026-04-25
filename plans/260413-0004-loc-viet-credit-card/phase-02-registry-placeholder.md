# Phase 2: Registry + Placeholder

## Priority: HIGH | Status: pending

## Overview

Đăng ký 4 templates vào KHCN registry và thêm placeholder group mới.

## Files to modify

### 1. `src/lib/loan-plan/khcn-template-registry.ts`

Thêm section mới sau Cầm cố:

```ts
// Hồ sơ thẻ Lộc Việt (thẻ tín dụng)
{ path: `${BASE}/Hồ sơ thẻ Lộc Việt/12299 Hop dong the tin dung Loc Viet.docx`, name: "HĐ thẻ tín dụng Lộc Việt (12299)", category: "the_loc_viet", methods: ["the_loc_viet"] },
{ path: `${BASE}/Hồ sơ thẻ Lộc Việt/12299.01 Giay de nghi phat hanh the LV kiem HD.docx`, name: "Giấy đề nghị phát hành thẻ LV (12299.01)", category: "the_loc_viet", methods: ["the_loc_viet"] },
{ path: `${BASE}/Hồ sơ thẻ Lộc Việt/1919.09 BCTD phat hanh the Loc Viet.docx`, name: "BCTĐ phát hành thẻ Lộc Việt (1919.09)", category: "the_loc_viet", methods: ["the_loc_viet"] },
{ path: `${BASE}/Hồ sơ thẻ Lộc Việt/8857.22.Phieu nhan ho so kiem giay hen Ca nhan.docx`, name: "Phiếu nhận hồ sơ kiêm giấy hẹn (8857.22)", category: "the_loc_viet", methods: ["the_loc_viet"] },
```

Thêm vào `DOC_CATEGORY_LABELS`:

```ts
the_loc_viet: "Hồ sơ thẻ Lộc Việt",
```

**Note:** Các templates chung (Danh mục hồ sơ, Giấy tờ pháp lý, TSBĐ) đã có `methods: []` → tự hiện cho tất cả methods kể cả `the_loc_viet`.

### 2. `src/lib/report/khcn-placeholder-registry.ts`

Thêm group mới:

```ts
{
  label: "Thẻ tín dụng Lộc Việt",
  prefix: "HĐTD",
  items: [
    "HĐTD.Hạn mức thẻ tín dụng",
    "HĐTD.HMTTD bằng chữ",
    "HĐTD.Số tài khoản",
    "HĐTD.Thời hạn hiệu lực của thẻ",
  ],
},
```

## Success Criteria

- API `/api/report/templates/khcn?loan_method=the_loc_viet` returns 4 templates under `the_loc_viet` category + shared templates
- Placeholder panel shows "Thẻ tín dụng Lộc Việt" group
