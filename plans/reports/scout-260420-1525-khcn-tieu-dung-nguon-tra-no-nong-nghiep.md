---
type: scout
date: 2026-04-20 15:25
topic: KHCN tiêu dùng - nguồn trả nợ từ sản xuất nông nghiệp
---

# Scout Report — Nguồn trả nợ từ sản xuất nông nghiệp (tiêu dùng)

## Tình trạng hiện tại

- `IncomeSourceType` **đã có giá trị `"agriculture"`** (khai báo từ trước) nhưng **chưa được wire end-to-end**:
  - ✅ Type/enum/constants/zod đầy đủ
  - ✅ UI dropdown chọn được "Nông nghiệp"
  - ❌ UI **không render input đặc thù** khi chọn agriculture (vẫn form 2 earner cho lương)
  - ❌ Builder DOCX **hardcode nguồn = lương**, không branch theo `income_source_type`
  - ❌ Chưa có placeholder `HĐTD.Tổng thu nhập từ nông nghiệp`

## Relevant Files

### Schema / Types / Constants (layer data)
- [src/lib/loan-plan/loan-plan-types.ts:87](src/lib/loan-plan/loan-plan-types.ts#L87) — `IncomeSourceType = "salary" | "rental" | "agriculture" | "business"`
- [src/lib/loan-plan/loan-plan-types.ts:101](src/lib/loan-plan/loan-plan-types.ts#L101) — `LoanPlanFinancialsExtended.income_source_type?`
- [src/lib/loan-plan/loan-plan-schemas.ts:21-24](src/lib/loan-plan/loan-plan-schemas.ts#L21-L24) — `INCOME_SOURCE_TYPES` + `incomeSourceEnum`
- [src/lib/loan-plan/loan-plan-constants.ts:31-36](src/lib/loan-plan/loan-plan-constants.ts#L31-L36) — `INCOME_SOURCE_OPTIONS` (label "Nông nghiệp" đã có)
- [src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-editor-types.ts:44](src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-editor-types.ts#L44) — editor form type
- [prisma/schema.prisma](prisma/schema.prisma) — `LoanPlan.financials_json` (JSON, merge keys kiểm soát)
- [src/services/loan-plan.service.ts:51-64](src/services/loan-plan.service.ts#L51-L64) — `EXTENDED_FINANCIAL_KEYS` whitelist (phải thêm field nông nghiệp mới vào đây nếu có)

### Builder / Service (layer logic)
- [src/services/khcn-builder-loan-plan-tieu-dung.ts:41-62](src/services/khcn-builder-loan-plan-tieu-dung.ts#L41-L62) — `buildIncomeSentence()` narrative cho lương
- [src/services/khcn-builder-loan-plan-tieu-dung.ts:72-73](src/services/khcn-builder-loan-plan-tieu-dung.ts#L72-L73) — lấy `earner1/2_monthly_income`
- [src/services/khcn-builder-loan-plan-tieu-dung.ts:156-165](src/services/khcn-builder-loan-plan-tieu-dung.ts#L156-L165) — placeholder `HĐTD.Tổng thu nhập từ lương` (SXKD hardcode = 0)
- [src/services/khcn-builder-loan-plan.ts](src/services/khcn-builder-loan-plan.ts) — parent builder, dispatch per method
- [src/lib/loan-plan/loan-plan-calculator.ts:129,175](src/lib/loan-plan/loan-plan-calculator.ts#L129) — generic, **không cần sửa**
- [src/lib/report/khcn-template-validator.ts:128,147](src/lib/report/khcn-template-validator.ts#L128) — placeholder registry check

### UI / Form (layer view)
- [src/app/report/customers/[id]/loan-plans/[planId]/page.tsx:349-362](src/app/report/customers/[id]/loan-plans/[planId]/page.tsx#L349-L362) — dropdown "Nguồn thu nhập chính trả nợ"
- [src/app/report/customers/[id]/loan-plans/[planId]/page.tsx:49](src/app/report/customers/[id]/loan-plans/[planId]/page.tsx#L49) — state `incomeSourceType`
- [src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-tieu-dung-section.tsx](src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-tieu-dung-section.tsx) — form 2 earner (lương); **chưa conditional theo source**
- [src/app/report/customers/[id]/loan-plans/new/page.tsx:81-89](src/app/report/customers/[id]/loan-plans/new/page.tsx#L81-L89) — dropdown ở trang tạo mới
- [src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-form-sections.tsx](src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-form-sections.tsx) — nơi mount subsection theo method

## 4 nơi sync khi thêm field (theo feedback memory)

Giả sử thêm nhóm field `agriculture_*` (crop, area, yield, annual_income):

1. **types** — [loan-plan-types.ts](src/lib/loan-plan/loan-plan-types.ts) → mở rộng `LoanPlanFinancialsExtended`
2. **zod** — [loan-plan-schemas.ts](src/lib/loan-plan/loan-plan-schemas.ts) → add vào schema financials (KHÔNG QUÊN — sẽ silent strip)
3. **whitelist** — [loan-plan.service.ts:51-64 `EXTENDED_FINANCIAL_KEYS`](src/services/loan-plan.service.ts#L51-L64) → add keys để merge không bị drop
4. **editor** — [loan-plan-editor-types.ts](src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-editor-types.ts) → expose sang form

## Đề xuất điểm cần sửa (implementation hotspots)

| Layer | File | Thay đổi |
|-------|------|----------|
| UI | `loan-plan-tieu-dung-section.tsx` | Conditional render: khi `incomeSourceType === "agriculture"` → hiện form nông nghiệp (loại cây/con, diện tích, sản lượng/năm, thu nhập ước tính) thay vì 2 earner |
| Types | `loan-plan-types.ts` | Thêm `agriculture_crop`, `agriculture_area_m2`, `agriculture_yield_annual`, `agriculture_annual_income` vào `LoanPlanFinancialsExtended` |
| Zod | `loan-plan-schemas.ts` | Add field tương ứng (optional) |
| Whitelist | `loan-plan.service.ts` | Thêm 4 keys vào `EXTENDED_FINANCIAL_KEYS` |
| Builder | `khcn-builder-loan-plan-tieu-dung.ts:156` | Switch theo `income_source_type`: nhánh agriculture → set placeholder `HĐTD.Tổng thu nhập từ nông nghiệp` từ `agriculture_annual_income` |
| Narrative | `khcn-builder-loan-plan-tieu-dung.ts:41` | Thêm `buildIncomeSentenceAgriculture()` sinh câu "...canh tác [cây/con] trên diện tích ... m², sản lượng ... /năm, thu nhập ~..." |
| Placeholder registry | (nơi define `HĐTD.*`) | Đăng ký `HĐTD.Tổng thu nhập từ nông nghiệp` để validator không reject |
| Template DOCX | File .docx BCĐX tiêu dùng | Cần cập nhật template chèn placeholder mới (ngoài code) |

## Unresolved Questions

1. **Scope field nông nghiệp**: chỉ cần tổng thu nhập năm hay full breakdown (cây/con, diện tích, sản lượng, chi phí)? Cần sample text từ hồ sơ thực.
2. **Mix source**: 1 hồ sơ tiêu dùng chỉ chọn 1 nguồn, hay có thể mix (lương + nông nghiệp)? Hiện state là single string — nếu mix phải đổi sang array.
3. **Template DOCX tiêu dùng** đã có placeholder `HĐTD.Tổng thu nhập từ nông nghiệp` chưa? Nếu chưa, ai cập nhật file .docx (dev hay user)?
4. **Xóa dữ liệu khi đổi source**: swap salary → agriculture có clear `earner1/2_*` không, hay giữ để user quay lại? (Đề xuất: giữ, chỉ hide UI.)
5. **Template BCĐX narrative** cho nông nghiệp: reuse `noClone` loop pattern hay tạo section riêng?
6. **KHDN agriculture vs KHCN agriculture**: cần phân biệt "SXKD nông nghiệp" (KHDN/hộ SXKD) vs "thu nhập hộ gia đình từ nông nghiệp" (KHCN tiêu dùng) — semantic khác nhau.
