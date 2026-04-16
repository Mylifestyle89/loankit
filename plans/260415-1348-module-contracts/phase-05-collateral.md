# Phase 5: Collateral Contract

## Priority: MEDIUM | Effort: M | Status: pending

## Goal

Contract cho Collateral (TSBĐ) — multi-type, multi-owner, linked to loans via selectedCollateralIds JSON array.

## Files to scout

- `prisma/schema.prisma` — Collateral model
- `src/services/customer.service.ts` (handleCollaterals)
- `src/app/api/customers/[id]/collaterals/**`
- `src/app/report/customers/[id]/components/collateral-config.ts` (COLLATERAL_TYPES)
- `src/app/report/loans/[id]/components/loan-collateral-picker.tsx`
- `src/services/khcn-builder-collateral-*.ts` (data builders)

## Sections

### Purpose
Tài sản bảo đảm (TSBĐ) cho khoản vay. Thuộc về Customer; Loan select subset qua `selectedCollateralIds`.

### Entities

```
Customer
  └── has many → Collateral
                   ├── collateral_type (land / vehicle / savings / other / camco_*)
                   ├── properties_json (type-specific fields)
                   ├── _owners array (multi-owner, stored in properties_json)
                   └── linked loans (via Loan.selectedCollateralIds JSON)
```

### Collateral types

Reference: `collateral-config.ts` COLLATERAL_TYPES
- `land` — QSD đất + TS gắn liền
- `vehicle` — phương tiện giao thông
- `savings` — thẻ tiết kiệm (Agribank)
- `other` — khác
- camco subtypes — cầm cố Agribank

### Business Rules

- `total_value` và `obligation` là top-level fields
- Type-specific fields lưu trong `properties_json` (VD: land_area, construction_area, biển số xe)
- `_owners` array: `[{name, relationship}]` — có thể multi-owner, lưu trong properties_json
- Owner đầu tiên (`_owners[0]`) = primary, fallback to `owner_name` field
- Loan liên kết qua `selectedCollateralIds` JSON array — empty = dùng TẤT CẢ
- `noClone` flag: khi loop >1 asset, render cùng section lặp thay vì clone DOCX section

### Permissions
- `admin/editor` — create/update/delete
- `viewer` — read

### Validation
Inline Zod trong API routes

### API
- GET `/api/customers/[id]/collaterals`
- POST/PATCH/DELETE `/api/customers/[id]/collaterals/[collateralId]`

### Edge Cases

- Multi-owner templates: cần loop theo `_owners` array
- Bên vay vs Bên thứ 3 (BT3) — phân biệt qua relationship field
- Camco template registry riêng (khcn-camco-template-registry.ts)
- Valuation rounding: `round_to_thousand_vnd`
- Bulk import (BK) cho land details

### Open Questions

- Có nên promote `_owners` ra bảng riêng (Owner table)?
- `properties_json` schema theo type — validate bằng discriminated Zod?

## Output

`docs/contracts/collateral.contract.md` (~220 lines)
