# Fix Multi-Asset BK Import

## Problem
BK import chỉ tạo 1 bản ghi cho mỗi loại asset (TSBĐ, VBA, TCTD, TV, GN, UNC) dù file .BK có nhiều assets cùng loại. Root cause: flat `Record<string, string>` ghi đè key trùng.

## Status: Complete

## Phase 1: bk-importer — collect asset groups
- **File**: `src/lib/import/bk-importer.ts`
- **Change**: Thêm `assetGroups: Record<string, Record<string, string>[]>` vào import result
- Asset codes lặp được: `SĐ`, `VBA`, `TCTD`, `TV`, `GN`, `UNC`
- Mỗi asset instance → 1 entry trong mảng, map properties theo `BK_ASSET_MAPPING`
- Vẫn giữ flat `values` cho backward compat (asset cuối cùng vẫn merge vào values)

## Phase 2: bk-types — update types
- **File**: `src/lib/import/bk-types.ts`
- **Change**: Thêm `assetGroups` vào `BkImportResult`

## Phase 3: bk-to-customer-relations — extract arrays
- **File**: `src/services/bk-to-customer-relations.ts`
- **Change**: Thêm `extractAllCollaterals(groups)`, `extractAllCreditAgribank(groups)`, etc.
- Mỗi hàm nhận `Record<string, string>[]` (mảng asset instances), trả về mảng records
- Giữ hàm cũ cho backward compat

## Phase 4: customer.service — create multiple records
- **File**: `src/services/customer.service.ts`
- **Change**: Trong `saveFromDraft`, thay `extractCollateral(values)` → loop `extractAllCollaterals(assetGroups["SĐ"])`
- Tương tự cho VBA, TCTD, TV

## Files Modified
1. `src/lib/import/bk-types.ts`
2. `src/lib/import/bk-importer.ts`
3. `src/services/bk-to-customer-relations.ts`
4. `src/services/customer.service.ts`

## Risk
- Low: backward compatible, old data không bị ảnh hưởng
- `values` flat vẫn giữ asset cuối cùng → existing code dùng values vẫn work
