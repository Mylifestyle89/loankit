# Phase 5: Template Registry + 3 File DOCX + Docs

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 1.5h
- **Depends on:** Phase 4

Tach template BCDX 2268.02A thanh **3 file rieng theo income source** (Q4 - Option C), extend registry voi field `incomeSources`, va viet docs huong dan bien tap 2 file moi (agriculture + business).

## Why 3 files

Salary / agriculture / business co layout khac biet ro:
- Salary: chi co paragraph + flat text ("Luong thang: ... / Tong thu nhap nam: ...")
- Agriculture: 2 bang (PA_CHIPHI_AGRI 6 cot + PA_TRANO theo nam) + narrative
- Business: 1 bang (PA_CHIPHI_BIZ 5 cot) + narrative + flat placeholders thang

Nhet chung 1 file phai dung conditional section (phuc tap) hoac chap nhan placeholders rong xau. Tach 3 file clean hon, user chon dung file theo nguon.

## Related Code Files

### Modify
- src/lib/loan-plan/khcn-template-registry.ts — them field `incomeSources?: IncomeSourceType[]` vao `KhcnDocTemplate`, them 2 entries moi
- src/lib/report/khcn-placeholder-registry.ts — them 2 loop groups + flat placeholders
- src/lib/report/khcn-template-validator.ts — verify khong reject (bao gom PA_TRANO cho tieu dung nua)
- src/app/report/customers/[id]/loan-plans/new/page.tsx — UI filter template theo method + source

### Create (docs)
- docs/khcn-tieu-dung-income-table-placeholders.md — huong dan bien tap 2 file .docx

### File ops (AI thuc hien programmatically)
- **Copy** `report_assets/KHCN templates/Báo cáo đề xuất/2268.02A BCDXCV tieu dung co TSBD.docx`
  → `2268.02A BCDXCV tieu dung nong nghiep.docx`
- **Copy** lan 2 → `2268.02A BCDXCV tieu dung kinh doanh.docx`
- **AI edit** 2 file moi: unzip docx, inject bang XML vao section 4.1, re-zip
- **Giu** file goc nguyen ven cho salary

## Implementation Steps

### 1. Extend `KhcnDocTemplate` type

```typescript
// khcn-template-registry.ts
export type KhcnDocTemplate = {
  path: string;
  name: string;
  category: string;
  methods: string[];
  incomeSources?: IncomeSourceType[]; // NEW — empty/undefined = all sources
};
```

### 2. Registry entries

Thay entry hien tai cho BCDX tieu dung:
```typescript
// Cu (giu — cho salary):
{
  path: `${BASE}/Báo cáo đề xuất/2268.02A BCDXCV tieu dung co TSBD.docx`,
  name: "BCĐX tiêu dùng có TSBĐ - Lương (2268.02A)",
  category: "bao_cao",
  methods: ["tieu_dung"],
  incomeSources: ["salary"], // NEW — chi cho salary
},
// Moi:
{
  path: `${BASE}/Báo cáo đề xuất/2268.02A BCDXCV tieu dung nong nghiep.docx`,
  name: "BCĐX tiêu dùng - Nông nghiệp (2268.02A)",
  category: "bao_cao",
  methods: ["tieu_dung"],
  incomeSources: ["agriculture"],
},
{
  path: `${BASE}/Báo cáo đề xuất/2268.02A BCDXCV tieu dung kinh doanh.docx`,
  name: "BCĐX tiêu dùng - Kinh doanh (2268.02A)",
  category: "bao_cao",
  methods: ["tieu_dung"],
  incomeSources: ["business"],
},
```

### 3. Filter helper

```typescript
export function getTemplatesForMethodAndSource(
  method: string,
  source?: IncomeSourceType,
): KhcnDocTemplate[] {
  return KHCN_TEMPLATES.filter(t => {
    const methodOk = t.methods.length === 0 || t.methods.includes(method);
    const sourceOk = !t.incomeSources || !source || t.incomeSources.includes(source);
    return methodOk && sourceOk;
  });
}
```

Old `getTemplatesForMethod()` giu lai (backward compat) — goi filter.length === 0 voi source.

### 4. Filter tai export step
Filter `getTemplatesForMethodAndSource()` duoc goi tai DOCX export UI (noi user chon template truoc khi xuat file), KHONG phai o new loan plan page.
Khi user mo export dialog voi plan co `income_source_type = agriculture` -> chi hien template agriculture (khong hien salary, business).

### 5. Placeholder registry

```typescript
{
  label: "Bảng chi phí nông nghiệp (Tiêu dùng)",
  prefix: "PA_CHIPHI_AGRI",
  loop: "PA_CHIPHI_AGRI",
  items: [
    "PA_CHIPHI_AGRI.STT",
    "PA_CHIPHI_AGRI.Khoản mục",
    "PA_CHIPHI_AGRI.ĐVT",
    "PA_CHIPHI_AGRI.Đơn giá",
    "PA_CHIPHI_AGRI.Số lượng",
    "PA_CHIPHI_AGRI.Thành tiền",
  ],
},
{
  label: "Bảng doanh thu kinh doanh (Tiêu dùng)",
  prefix: "PA_CHIPHI_BIZ",
  loop: "PA_CHIPHI_BIZ",
  items: [
    "PA_CHIPHI_BIZ.STT",
    "PA_CHIPHI_BIZ.Nhóm Hàng",
    "PA_CHIPHI_BIZ.Số lượng",
    "PA_CHIPHI_BIZ.Giá trị nhập hàng",
    "PA_CHIPHI_BIZ.Doanh thu dự kiến",
  ],
},
{
  label: "HĐTD - Thu nhập tiêu dùng mở rộng",
  prefix: "HĐTD",
  items: [
    "HĐTD.Mô tả nguồn trả nợ",
    "HĐTD.Tổng chi phí nông nghiệp",
    "HĐTD.Tổng thu nhập nông nghiệp",
    "HĐTD.Lợi nhuận nông nghiệp",
    "HĐTD.Chi phí sinh hoạt/năm",
    "HĐTD.Thu nhập trả nợ/năm",
    "HĐTD.Tổng giá trị nhập",
    "HĐTD.Tổng doanh thu",
    "HĐTD.Lợi nhuận kinh doanh/năm",
    "HĐTD.Chi phí khác/năm",
    "HĐTD.Thu nhập bình quân/tháng",
    "HĐTD.Chi phí sinh hoạt/tháng",
    "HĐTD.Thu nhập trả nợ/tháng",
    "HĐTD.Số gốc trả/tháng",
  ],
},
```

### 6. Docs huong dan (docs/khcn-tieu-dung-income-table-placeholders.md)

Noi dung:

```markdown
# Huong dan bien tap 2 file DOCX tieu dung (nong nghiep + kinh doanh)

## File 1: 2268.02A BCDXCV tieu dung nong nghiep.docx

Copy tu file salary goc, vao section "4.1. Kha nang tra no", thay the toan bo block nguon luong bang:

"a) Nguồn trả nợ: {HĐTD.Mô tả nguồn trả nợ}, chi phí doanh thu và lợi nhuận bình quân trong 01 năm như sau:"

Đơn vị: đồng
[#PA_CHIPHI_AGRI]
| {STT} | {Khoản mục} | {ĐVT} | {Đơn giá} | {Số lượng} | {Thành tiền} |
[/PA_CHIPHI_AGRI]

"b) Tổng chi phí bình quân 01 năm (chi phí sinh hoạt): {HĐTD.Chi phí sinh hoạt/năm} đồng
c) Thu nhập để trả nợ: {HĐTD.Thu nhập trả nợ/năm} đồng
d) Định kỳ trả nợ: (text co dinh hoac placeholder khac)"

"Chi tiết số tiền trả nợ và thu nhập còn lại như sau:"
[#PA_TRANO]
| {Năm} | {Số tiền vay} | {Gốc trả} | {Lãi trả} | {Thu nhập trả nợ} | {Thu nhập còn lại} |
[/PA_TRANO]

## File 2: 2268.02A BCDXCV tieu dung kinh doanh.docx

Section "4.1":
"a) Thu nhập để trả nợ: {HĐTD.Mô tả nguồn trả nợ}, chi phí và doanh thu như sau:"

[#PA_CHIPHI_BIZ]
| {STT} | {Nhóm Hàng} | {Số lượng} | {Giá trị nhập hàng} | {Doanh thu dự kiến} |
[/PA_CHIPHI_BIZ]

"- Lợi nhuận bình quân trong 01 năm: {HĐTD.Lợi nhuận kinh doanh/năm} đồng
- Chi phí khác (mặt bằng, nhân công, thuế...): {HĐTD.Chi phí khác/năm} đồng
=> Thu nhập bình quân hàng tháng: {HĐTD.Thu nhập bình quân/tháng} đồng
b) Chi phí sinh hoạt hàng tháng: {HĐTD.Chi phí sinh hoạt/tháng} đồng
c) Thu nhập còn lại để trả nợ: {HĐTD.Thu nhập trả nợ/tháng} đồng
d) Định kỳ trả nợ: Hàng tháng, trả gốc {HĐTD.Số gốc trả/tháng} đồng/tháng..."
```

## Todo List
- [ ] Them field `incomeSources` vao type `KhcnDocTemplate`
- [ ] Them 2 entries moi vao registry (agriculture + business)
- [ ] Update entry salary hien tai voi `incomeSources: ["salary"]`
- [ ] Viet `getTemplatesForMethodAndSource()` filter
- [ ] Update UI new loan plan page de filter dung
- [ ] Them 3 groups vao placeholder registry
- [ ] Verify validator pass
- [ ] Copy file salary -> 2 file moi (agriculture, business)
- [ ] Edit 2 file moi theo huong dan docs (out-of-code)
- [ ] Viet docs/khcn-tieu-dung-income-table-placeholders.md
- [ ] Compile check

## Success Criteria
- Registry list dung 3 templates rieng cho 3 source
- User chon agriculture -> picker chi hien template agriculture (khong hien business)
- Validator pass khi chay builder voi 3 source
- 2 file .docx moi render dung bang + placeholders sau edit

## Risk Mitigation
- 3 file phai maintain dong bo (text chung: ten ngan hang, footer...) -> ghi note trong docs
- Neu user chua edit 2 file moi -> template chi co placeholders `{...}` khong render bang -> hien text raw (acceptable, warning)

## Unresolved Questions
- Co can viet script test auto-verify 3 file .docx co du placeholder/loop cần thiết khong?
