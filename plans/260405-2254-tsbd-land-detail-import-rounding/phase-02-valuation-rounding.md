# Phase 2: Valuation Rounding (Đất + Nhà)

## Overview
- Priority: HIGH
- Status: ⬜ Pending
- 2 dropdown làm tròn riêng biệt cho đất và nhà
- Real-time + tooltip hiện giá trị gốc

## Related Files
- `src/app/report/customers/[id]/components/collateral-config.ts` — constants + helper
- `src/app/report/customers/[id]/components/collateral-form-sub-components.tsx` — LandTypeRows
- `src/app/report/customers/[id]/components/collateral-form.tsx` — house section

## Implementation Steps

### Step 1: Thêm constants + helper (collateral-config.ts)

```ts
export const ROUNDING_OPTIONS = [
  { value: "0", label: "Không làm tròn" },
  { value: "1000", label: "Hàng nghìn" },
  { value: "1000000", label: "Hàng triệu" },
] as const;

export function roundDown(value: number, precision: number): number {
  if (!precision || precision <= 0) return value;
  return Math.floor(value / precision) * precision;
}
```

### Step 2: Update LandTypeRows (collateral-form-sub-components.tsx)

**Props thay đổi:**
- Thêm `rounding: string` (giá trị từ properties.land_rounding)
- Thêm `onRoundingChange: (val: string) => void`

**UI thay đổi:**
```
CHI TIẾT GIÁ TRỊ ĐẤT    [Làm tròn: ▾ dropdown ▾]
```
- Dropdown nhỏ bên phải header
- Khi rounding != "0": thành tiền = roundDown(area × price, precision)
- Ô thành tiền hiện title tooltip = giá trị gốc (chưa làm tròn)

**Logic setField cần update:**
```ts
const raw = area && price ? Math.round(area * price) : 0;
const precision = Number(rounding) || 0;
const rounded = precision > 0 ? roundDown(raw, precision) : raw;
next[`land_value_${idx}`] = rounded ? String(rounded) : "";
```

### Step 3: Update collateral-form.tsx — Nhà

**Tìm phần tính `house_appraisal_value`** (useEffect hoặc onChange handler).

Thêm:
- Dropdown làm tròn cùng hàng header "Định giá nhà"
- Lưu `house_rounding` vào properties
- Khi tính: `roundDown(houseArea * housePrice, Number(props.house_rounding) || 0)`
- Tooltip trên ô thành tiền nhà = giá trị gốc

### Step 4: Recalc khi rounding thay đổi

Khi user đổi dropdown:
1. Set `land_rounding` / `house_rounding` vào properties
2. Trigger recalc tất cả `land_value_1/2/3` hoặc `house_appraisal_value`
3. `total_value` auto-recalc (useEffect đã có)

## UX Detail

**Dropdown style:** Select nhỏ, cùng style inputCls, width ~140px
```tsx
<select value={rounding} onChange={...} className="...">
  {ROUNDING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
</select>
```

**Tooltip:** Dùng HTML `title` attribute trên ô thành tiền (đơn giản, không cần thư viện)
```tsx
title={raw !== rounded ? `Gốc: ${fmtNumber(String(raw))}` : undefined}
```

## Properties lưu trữ
- `land_rounding`: "0" | "1000" | "1000000" (default: "0")
- `house_rounding`: "0" | "1000" | "1000000" (default: "0")

## Todo
- [ ] Thêm ROUNDING_OPTIONS + roundDown vào collateral-config.ts
- [ ] Update LandTypeRows: thêm dropdown + logic làm tròn + tooltip
- [ ] Update collateral-form.tsx: thêm dropdown nhà + logic
- [ ] Đảm bảo total_value recalc đúng
- [ ] Build check
