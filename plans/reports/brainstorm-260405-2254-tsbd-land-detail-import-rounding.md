# Brainstorm: TSBĐ Land Detail Import + Valuation Rounding

## Problem Statement

2 tính năng cần thêm cho phần TSBĐ (Collateral) trong KHCN module:

1. **BK Import thiếu chi tiết định giá đất** — `extractCollateral()` chỉ import `land_area` tổng + `land_value` tổng, không import từng loại đất (type, area, unit_price riêng).
2. **Thiếu chức năng làm tròn giá trị định giá** — thực tế nghiệp vụ ngân hàng thường làm tròn xuống thành tiền đất/nhà đến hàng nghìn hoặc triệu.

---

## Quyết định đã thống nhất

| Câu hỏi | Quyết định |
|----------|-----------|
| Max loại đất import | **3 loại** (thêm mapping cho loại 3 vào BK) |
| DT riêng từng loại | **Có** — BK có trường riêng: "Diện tích đất 1/2/3" |
| Mức làm tròn | **3 mức**: Không / Nghìn (1.000) / Triệu (1.000.000) |
| Thời điểm làm tròn | **Real-time** + tooltip hiện giá trị gốc |
| Dropdown đất | Trên header section "Chi tiết giá trị đất" |
| Dropdown nhà | Cùng hàng header "Định giá nhà" |
| Tên trường BK mới | "Diện tích đất 1/2/3", "Loại đất 3", "Đơn giá đất 3", "Giá trị đất 3" |

---

## Approach

### Feature 1: BK Import Chi Tiết Đất

**Files cần sửa:**

| File | Thay đổi |
|------|----------|
| `src/lib/import/bk-mapping.ts` | Thêm mapping: "Diện tích đất 1/2/3" → `A.collateral.land_area_1/2/3`, "Loại đất 3" → `A.collateral.land_type_3`, "Đơn giá đất 3" → `A.collateral.land_unit_price_3`, "Giá trị đất 3" → `A.collateral.land_value_3` |
| `src/services/bk-to-customer-relations.ts` | Trong `extractCollateral()`, thêm mapping `land_type_1/2/3`, `land_area_1/2/3`, `land_unit_price_1/2/3`, `land_value_1/2/3` vào `properties_json` |

**Logic:**
- BK fields map → `A.collateral.land_*` → `extractCollateral()` đọc ra → ghi vào `properties_json` của CollateralItem
- Form UI đã sẵn sàng (LandTypeRows render 3 rows) — chỉ cần data đúng format là hiển thị tự động

### Feature 2: Làm Tròn Giá Trị Định Giá

**Files cần sửa:**

| File | Thay đổi |
|------|----------|
| `src/app/report/customers/[id]/components/collateral-config.ts` | Thêm `ROUNDING_OPTIONS` constant, hàm `roundDown(value, precision)` |
| `src/app/report/customers/[id]/components/collateral-form-sub-components.tsx` | `LandTypeRows`: thêm dropdown + logic làm tròn real-time cho thành tiền đất |
| `src/app/report/customers/[id]/components/collateral-form.tsx` | Section nhà: thêm dropdown + logic làm tròn cho `house_appraisal_value` |

**Thiết kế:**

```
ROUNDING_OPTIONS = [
  { value: "0", label: "Không làm tròn" },
  { value: "1000", label: "Hàng nghìn" },
  { value: "1000000", label: "Hàng triệu" },
]

roundDown(value: number, precision: number): number
  → precision = 0: return value
  → else: return Math.floor(value / precision) * precision
```

**UX cho đất:**
```
CHI TIẾT GIÁ TRỊ ĐẤT                    [Làm tròn: ▾ Không ▾]
Loại đất          | Diện tích | Đơn giá   | Thành tiền
Đất ở tại đô thị  | 42,86     | 110.000.000| 4.714.000.000  ← tooltip: "Gốc: 4.714.600.000"
```

**UX cho nhà:**
```
ĐỊNH GIÁ NHÀ                             [Làm tròn: ▾ Không ▾]
DT định giá | Đơn giá nhà | Thành tiền nhà
```

**Lưu trữ:** 
- Mức làm tròn lưu trong `properties`: `land_rounding` và `house_rounding` (string, giá trị "0" | "1000" | "1000000")
- Giá trị thành tiền đã làm tròn ghi đè vào `land_value_N` / `house_appraisal_value` — đây là giá trị cuối cùng xuất ra report
- Tooltip hiện giá trị gốc (tính real-time từ DT × đơn giá, không lưu riêng)

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| BK file cũ không có trường mới → import thiếu data | Fallback: nếu không tìm thấy trường mới thì bỏ qua, không break import cũ |
| Giá trị gốc bị mất sau làm tròn → user muốn revert | Tooltip hiện giá trị gốc real-time; đổi dropdown về "Không" sẽ tính lại chính xác |
| total_value tự tính từ sum land + house → cần recalc khi rounding thay đổi | useEffect hiện tại đã auto-sum → chỉ cần trigger state update |

---

## Success Criteria

- [ ] BK import populate đầy đủ 3 loại đất (type, area, unit_price, value) vào form
- [ ] Dropdown làm tròn đất hoạt động real-time, hiện tooltip giá gốc
- [ ] Dropdown làm tròn nhà hoạt động độc lập
- [ ] total_value cập nhật đúng khi rounding thay đổi
- [ ] BK import cũ (không có trường mới) vẫn hoạt động bình thường
- [ ] Build pass, không regression
