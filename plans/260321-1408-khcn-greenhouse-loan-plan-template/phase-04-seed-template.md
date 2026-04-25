# Phase 4: Seed Template "Nha kinh nong nghiep"

## Overview
- **Priority:** P2
- **Status:** pending
- **Effort:** 0.5h
- **Depends on:** None (independent)

Them template moi vao seed script cho phuong an trung dai han nha kinh.

## Related Code Files

### Modify
- `prisma/seed-loan-templates.ts` — them template "Nha kinh nong nghiep" + update upsert logic

## Implementation Steps

### 1. Them template data

```typescript
const nhaKinh: TemplateData = {
  name: "PA Dựng nhà kính trồng hoa",
  category: "nong_nghiep",
  loan_type: "trung_dai",
  description: "Dựng nhà kính trồng hoa Cát tường (vay trung dài hạn, có khấu hao)",
  cost_items: [
    { name: "Xử lý đất", unit: "m2", default_price: 16000 },
    { name: "Cây giống", unit: "cây", default_price: 3200 },
    { name: "Phân hữu cơ", unit: "m3", default_price: 1600000 },
    { name: "Đạm", unit: "kg", default_price: 18000 },
    { name: "Lân", unit: "kg", default_price: 4000 },
    { name: "KaLi", unit: "kg", default_price: 18000 },
    { name: "Phân vi sinh", unit: "kg", default_price: 10000 },
    { name: "NPK", unit: "kg", default_price: 20000 },
    { name: "Vôi", unit: "kg", default_price: 2000 },
    { name: "Thuốc BVTV", unit: "lít", default_price: 1500000 },
    { name: "Chi phí tưới", unit: "giờ", default_price: 70000 },
    { name: "Công lao động", unit: "công", default_price: 300000 },
  ],
  revenue_items: [{ description: "Sản lượng × Giá bán", formula_type: "yield_area" }],
  defaults: { interest_rate: 0.085, loan_term_months: 96, tax_rate: 0 },
};
```

### 2. Update seed logic

Hien tai findFirst by category → skip. Nhung nong_nghiep da co template "PA Trong hoa".
Can doi logic: findFirst by `name` thay vi `category` de cho phep nhieu template cung category.

```typescript
const existing = await prisma.loanPlanTemplate.findFirst({
  where: { name: tpl.name },  // doi tu category sang name
});
```

### 3. Them defaults moi cho nha kinh

Trong `defaults_json`, them:
```json
{
  "loan_type": "trung_dai",
  "interest_rate": 0.085,
  "loan_term_months": 96,
  "depreciation_years": 8,
  "asset_unit_price": 270000000,
  "preferential_rate": 0.075
}
```

### 4. Update ALL_TEMPLATES

```typescript
const ALL_TEMPLATES = [nongNghiep, kinhDoanh, chanNuoi, anUong, xayDung, hanMuc, nhaKinh];
```

## Todo List
- [ ] Them nhaKinh template data
- [ ] Doi findFirst logic tu category sang name
- [ ] Update ALL_TEMPLATES array
- [ ] Chay `npx tsx prisma/seed-loan-templates.ts` verify
- [ ] Verify compile

## Success Criteria
- Seed script tao duoc template moi khong anh huong template cu
- Template co loan_type = "trung_dai", depreciation defaults
