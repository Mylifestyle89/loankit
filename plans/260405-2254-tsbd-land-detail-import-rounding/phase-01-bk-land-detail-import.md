# Phase 1: BK Import Chi Tiết Đất

## Overview
- Priority: HIGH
- Status: ⬜ Pending
- Import land_type, land_area, land_unit_price, land_value cho 3 loại đất từ BK file

## Related Files
- `src/lib/import/bk-mapping.ts` — BK_ASSET_MAPPING["SĐ"]
- `src/services/bk-to-customer-relations.ts` — extractCollateral()

## Implementation Steps

### Step 1: Thêm mapping BK (bk-mapping.ts)

Trong `BK_ASSET_MAPPING["SĐ"]`, thêm các trường mới:

```ts
// Sau "Giá trị đất 2": "A.collateral.land_value_2",
"Diện tích đất 1": "A.collateral.land_area_1",
"Diện tích đất 2": "A.collateral.land_area_2",
"Diện tích đất 3": "A.collateral.land_area_3",
"Loại đất 3": "A.collateral.land_type_3",
"Đơn giá đất 3": "A.collateral.land_unit_price_3",
"Giá trị đất 3": "A.collateral.land_value_3",
```

### Step 2: Update extractCollateral() (bk-to-customer-relations.ts)

Thêm vào `propMapping` object:

```ts
"A.collateral.land_type_1": "land_type_1",
"A.collateral.land_type_2": "land_type_2",
"A.collateral.land_type_3": "land_type_3",
"A.collateral.land_area_1": "land_area_1",
"A.collateral.land_area_2": "land_area_2",
"A.collateral.land_area_3": "land_area_3",
"A.collateral.land_unit_price_1": "land_unit_price_1",
"A.collateral.land_unit_price_2": "land_unit_price_2",
"A.collateral.land_unit_price_3": "land_unit_price_3",
"A.collateral.land_value_1": "land_value_1",
"A.collateral.land_value_2": "land_value_2",
"A.collateral.land_value_3": "land_value_3",
```

## Notes
- BK cũ không có trường mới → import bỏ qua (str() return null → skip), KHÔNG break
- Form UI (LandTypeRows) đã sẵn sàng render 3 rows — data đúng format sẽ hiển thị tự động
- Không cần sửa UI

## Todo
- [ ] Thêm mapping vào BK_ASSET_MAPPING["SĐ"]
- [ ] Thêm 12 entries vào propMapping trong extractCollateral()
- [ ] Build check
