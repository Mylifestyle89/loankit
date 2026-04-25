# Brainstorm: Phương án vay tiêu dùng dạng text

## Problem statement

Thêm loan_method `tieu_dung` vào loan-plan builder với form đơn giản (không cost/revenue) và output narrative text cho phần 4.1 hồ sơ vay — "Khả năng trả nợ của khách hàng".

Nguồn trả nợ = lương + phụ cấp của KH và vợ/chồng. Tính toán đơn giản: thu − chi = dư trả gốc.

## Decisions

| # | Câu hỏi | Chọn |
|---|---------|------|
| 1 | Số earners | Tối đa 2 slot cố định (KH + vợ/chồng) |
| 2 | Narrative a) | Builder generate string → `PA.Câu thu nhập` |
| 3 | Principal/kỳ | `loanAmount / totalPeriods` |
| 4 | Scope | Full: form + builder + DOCX template |
| 5 | Gender | Field riêng trong form (select Ông/Bà) |
| 6 | Chi phí lãi | `loanAmt × avg_other_loan_rate × 3/12` — label rõ "ước tính khoản này" |
| 7 | Template | Co-exist với template cũ, thêm vào registry |

## Data shape (financials_json khi loan_method = "tieu_dung")

```ts
type TieuDungFinancials = {
  loanAmount: number;
  interestRate: number;
  term_months: number;
  repayment_frequency: number;       // 1/3/6/12

  earner1_title: "Ông" | "Bà";
  earner1_name: string;
  earner1_workplace: string;
  earner1_monthly_income: number;

  earner2_title?: "Ông" | "Bà";
  earner2_name?: string;
  earner2_workplace?: string;
  earner2_monthly_income?: number;

  living_expenses_3m: number;
  avg_other_loan_rate: number;
  other_costs_3m: number;
};
```

## Form UI (LoanPlanTieuDungSection)

Render khi `loanMethod === "tieu_dung"`. Ẩn: CostItemsTable, Revenue, turnoverCycles, tax, farmAddress, TrungDaiSection.

Sections:
1. **Người 1 (KH)**: title (Ông/Bà) | name | workplace | monthly_income
2. **Người 2 (V/C)** (collapsible/optional): title | name | workplace | monthly_income
3. **Chi phí 3 tháng**: living_expenses_3m | avg_other_loan_rate | other_costs_3m
4. **Định kỳ trả**: term_months | repayment_frequency (reuse dropdown trung_dai)
5. **Preview card (readonly)**: Tổng thu / Tổng chi / Dư / Mỗi kỳ / Còn lại

## Builder logic (khcn-builder-loan-plan.ts)

```ts
if (loanMethod === "tieu_dung") {
  const i1 = earner1_monthly_income;
  const i2 = earner2_monthly_income ?? 0;
  const totalIncome3m = (i1 + i2) * 3;

  const interestCost3m = Math.round(loanAmt * avg_other_loan_rate * 3 / 12);
  const totalExpenses3m = living_expenses_3m + interestCost3m + other_costs_3m;
  const available = totalIncome3m - totalExpenses3m;

  const totalPeriods = Math.ceil(term_months / repayment_frequency);
  const perPeriod = Math.round(loanAmt / totalPeriods);
  const remaining = available - perPeriod;

  // Narrative sentence
  const s1 = `${earner1_title} ${earner1_name} hiện đang công tác tại ${earner1_workplace} với mức lương và phụ cấp hàng tháng là ${fmtN(i1)} đồng`;
  const s2 = earner2_name
    ? `; ${earner2_title} ${earner2_name} hiện đang công tác tại ${earner2_workplace} với mức lương và phụ cấp hàng tháng là ${fmtN(i2)} đồng`
    : "";

  data["PA.Câu thu nhập"] = s1 + s2;
  data["PA.Tổng thu nhập 3 tháng"] = fmtN(totalIncome3m);
  data["PA.Tổng chi phí 3 tháng"] = fmtN(totalExpenses3m);
  data["PA.Chi phí sinh hoạt 3 tháng"] = fmtN(living_expenses_3m);
  data["PA.Lãi suất vay khác"] = `${(avg_other_loan_rate * 100).toFixed(0)}%`;
  data["PA.Chi phí lãi vay 3 tháng"] = fmtN(interestCost3m);
  data["PA.Chi phí khác 3 tháng"] = fmtN(other_costs_3m);
  data["PA.Dư trả gốc"] = fmtN(available);
  data["PA.Số kỳ trả gốc"] = String(totalPeriods);
  data["PA.Số tiền trả gốc mỗi kỳ"] = fmtN(perPeriod);
  data["PA.Thu nhập còn lại"] = fmtN(remaining);
  data["PA.Kỳ hạn trả gốc text"] = `${repayment_frequency} tháng/kỳ`;
}
```

Tách thành file riêng: `src/services/khcn-builder-loan-plan-tieu-dung.ts` (KISS, dưới 200 LOC).

## DOCX template

- Co-exist: thêm template mới vào `report_assets/KHCN templates/Phương án sử dụng vốn/PA tiêu dùng lương.docx`
- Đăng ký vào registry với metadata `loan_method: "tieu_dung"`
- Placeholder cho phần 4.1: dùng các `PA.*` field ở trên

## Files thay đổi

**New:**
- `src/services/khcn-builder-loan-plan-tieu-dung.ts` — builder branch
- `src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-tieu-dung-section.tsx` — form section
- `report_assets/KHCN templates/.../PA tieu dung luong.docx` — template mẫu

**Modified:**
- `src/services/khcn-builder-loan-plan.ts` — detect `tieu_dung` → gọi sub-builder
- `src/lib/loan-plan/loan-plan-types.ts` — extend `LoanPlanFinancialsExtended`
- `src/lib/loan-plan/loan-plan-schemas.ts` — zod validation cho tieu_dung fields
- `src/services/loan-plan.service.ts` — thêm keys vào `EXTENDED_FINANCIAL_KEYS`
- `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx` — state + save/load + render section
- `src/app/report/customers/[id]/loan-plans/[planId]/loan-plan-editor-types.ts` — type
- `src/lib/loan-plan/khcn-template-registry.ts` — register template

## Risks

- **Migration plans cũ**: existing tiêu dùng plans có shape khác → builder phải null-safe, fallback về behavior cũ khi thiếu field
- **DOCX path**: test kỹ template mới với real data trước khi merge
- **Validation strict**: zod reject khi thiếu earner1_name → có thể break form khi user đang nhập dở. Cần optional với warning thay vì error

## Success criteria

- [ ] Form tiêu dùng hiển thị đúng fields, hide cost/revenue
- [ ] Preview card tính đúng: thu − chi − gốc = còn lại (match ví dụ user)
- [ ] Save/load persist đúng shape vào financials_json
- [ ] DOCX gen phần 4.1 match 100% format ví dụ của user
- [ ] Existing SXKD plans không bị ảnh hưởng (regression test)
- [ ] Build + tsc clean

## Next steps

Create plan via `/ck:plan` với context này.

## Unresolved

- Preview card logic: `principalPerPeriod = loanAmt/totalPeriods` có khớp với `available` không? Nếu `available < perPeriod` → cảnh báo "thu nhập không đủ trả nợ" (UX hint)
- Template DOCX mẫu: tôi không có sẵn file, cần user cung cấp file docx gốc (hoặc copy từ template cũ rồi chỉnh placeholder)
