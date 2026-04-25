# Brainstorm: Template Phương Án Nhà Kính Trồng Cát Tường

**Date:** 2026-03-21
**Status:** Agreed
**Approach:** C (Mở rộng model + Seed template)

---

## Problem Statement

File Excel "PA dựng nhà kính trồng cát tường" chứa phương án vay vốn nông nghiệp trung dài hạn với cấu trúc phức tạp hơn builder hiện tại:
- 13 hạng mục chi phí cố định (trồng hoa)
- Khấu hao nhà kính (8 năm, 270tr/sào)
- Bảng trả nợ theo năm (10 năm)
- Hợp đồng thi công
- Dư nợ hiện tại (Agribank + TCTD khác)

## Current Builder Gaps

| Feature | Hiện tại | Cần thêm |
|---------|----------|----------|
| Khấu hao tài sản | ❌ | depreciation_years, asset_unit_price |
| Bảng trả nợ theo năm | ❌ | Auto-calc từ loanAmount/rate/term |
| HĐ thi công | ❌ | construction_contract_no/date |
| Dư nợ hiện tại | ❌ | existing_debt fields |
| Số sào đất | ❌ | land_area_sau |

## Agreed Solution

### 1. Mở rộng LoanPlanFinancials type

```typescript
// Thêm vào loan-plan-types.ts
depreciation_years?: number;        // Số năm khấu hao (e.g., 8)
asset_unit_price?: number;          // Đơn giá tài sản/sào (e.g., 270,000,000)
land_area_sau?: number;             // Số sào đất (e.g., 10)
construction_contract_no?: string;  // Số HĐ thi công
construction_contract_date?: string; // Ngày HĐ thi công
```

### 2. Seed LoanPlanTemplate "Nhà kính nông nghiệp"

```
category: "nong_nghiep"
name: "Dựng nhà kính trồng hoa"
cost_items_template_json: [
  { name: "Xử lý đất", unit: "m2" },
  { name: "Cây giống", unit: "cây" },
  { name: "Phân hữu cơ", unit: "m3" },
  { name: "Đạm", unit: "kg", group: "Phân vô cơ" },
  { name: "Lân", unit: "kg", group: "Phân vô cơ" },
  { name: "KaLi", unit: "kg", group: "Phân vô cơ" },
  { name: "Phân vi sinh", unit: "kg", group: "Phân vô cơ" },
  { name: "NPK", unit: "kg", group: "Phân vô cơ" },
  { name: "Vôi", unit: "kg" },
  { name: "Thuốc BVTV", unit: "lít" },
  { name: "Chi phí tưới", unit: "giờ" },
  { name: "Công lao động", unit: "công" },
]
defaults_json: { depreciation_years: 8, loan_method: "trung_dai" }
```

### 3. PA_TRANO loop cho DOCX

Builder output thêm `PA_TRANO[]` loop array:

```
PA_TRANO[].Năm, PA_TRANO[].Thu nhập trả nợ, PA_TRANO[].Dư nợ,
PA_TRANO[].Gốc trả, PA_TRANO[].Lãi trả, PA_TRANO[].TN còn lại
```

Auto-calculated:
- Gốc trả = loanAmount / (term_months/12)
- Lãi năm 1 = dư nợ × ưu đãi rate, năm 2+ = dư nợ × standard rate
- Thu nhập trả nợ = lợi nhuận + khấu hao
- TN còn lại = thu nhập trả nợ - gốc - lãi

### 4. Mở rộng XLSX Parser Type A

Parser đọc thêm từ row 31-46 (Sheet1) các fields:
- AO (Số năm khấu hao), AP (Đơn giá nhà kính), AW (Lãi suất)
- AV (Thời hạn vay), BF (Địa chỉ đất NN)
- BG (Số HĐ thi công), BH (Ngày HĐ)
- BM-BX (Dư nợ Agribank + TCTD khác)

### 5. PA Builder placeholders mới

```
PA.Khấu hao nhà kính = asset_unit_price × land_area_sau / depreciation_years
PA.Số sào đất
PA.Đơn giá nhà kính/sào
PA.Số HĐ thi công
PA.Ngày HĐ thi công
```

## Implementation Phases

1. **Phase 1:** Mở rộng types + Prisma schema (nếu cần thêm columns)
2. **Phase 2:** Mở rộng XLSX parser Type A đọc fields mới
3. **Phase 3:** Thêm bảng trả nợ auto-calc + PA_TRANO loop trong builder
4. **Phase 4:** Seed template "Nhà kính nông nghiệp"
5. **Phase 5:** UI form fields cho khấu hao, HĐ thi công

## Risks

- Prisma migration nếu thêm columns vào LoanPlan table → cần kiểm tra schema hiện tại
- Bảng trả nợ phụ thuộc lãi suất ưu đãi năm đầu vs standard → cần 2 rate fields
- DOCX template cần có sẵn `[PA_TRANO]` loop markers

## Next Steps

Tạo implementation plan chi tiết với `/plan`.
