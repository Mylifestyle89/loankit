# Phase 5: UI Form Fields Moi

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 2h
- **Depends on:** Phase 1

Them cac input fields cho khau hao, HD thi cong, lai suat uu dai vao loan plan form. Hien thi bang tra no preview.

## Context
- Loan plan page: `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx`
- New loan plan: `src/app/report/customers/[id]/loan-plans/new/page.tsx`

## Related Code Files

### Modify
- `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx` — them input fields + bang tra no table
- `src/app/report/customers/[id]/loan-plans/new/page.tsx` — template selection cho "trung_dai"

## Implementation Steps

### 1. Them conditional fields khi loan_method = "trung_dai"

Hien input fields khi user chon loan_method "trung_dai":

```
- So nam khau hao (number input)
- Don gia tai san/sao (currency input)
- So sao dat (number input)
- Lai suat uu dai nam dau (% input)
- So HD thi cong (text input)
- Ngay HD thi cong (date input)
```

### 2. Save fields vao financials_json

Khi save, merge cac fields moi vao financials object:
```typescript
financials.depreciation_years = formData.depreciationYears;
financials.asset_unit_price = formData.assetUnitPrice;
financials.land_area_sau = formData.landAreaSau;
financials.preferential_rate = formData.preferentialRate;
financials.construction_contract_no = formData.constructionContractNo;
financials.construction_contract_date = formData.constructionContractDate;
```

### 3. Bang tra no preview table

Khi loan_method = "trung_dai" va co du data, hien table preview:

| Nam | Thu nhap tra no | Du no | Goc tra | Lai tra | TN con lai |
|-----|----------------|-------|---------|---------|------------|

Dung `calcRepaymentSchedule()` tu Phase 1 de tinh realtime.

### 4. Template selection update

Trong new page, khi user chon template "Nha kinh nong nghiep":
- Auto-fill loan_method = "trung_dai"
- Auto-fill defaults (depreciation_years, asset_unit_price, preferential_rate)
- Hien cac fields moi

### 5. Read existing values khi edit

Khi load existing loan plan, parse financials_json va populate cac fields moi.

## Todo List
- [ ] Them conditional UI fields cho "trung_dai"
- [ ] Wire save logic cho fields moi
- [ ] Them bang tra no preview component
- [ ] Update template selection defaults
- [ ] Load existing values khi edit
- [ ] Verify compile + UI render

## Success Criteria
- Chon template "Nha kinh" → auto-fill defaults
- Nhap du data → bang tra no hien dung
- Save + reload → fields van dung gia tri
- Khong hien fields nha kinh khi loan_method != "trung_dai"
