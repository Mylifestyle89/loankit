# Phase 02 — Loan-plan Interest Formula Fix (C3)

## Context Links
- `plans/reports/code-reviewer-260408-1556-core.md` § C3
- `src/lib/loan-plan/loan-plan-calculator.ts:21-23, 172-197`
- `src/services/khcn-builder-loan-plan.ts:168-174` (builder override path)
- `src/services/loan-plan.service.ts` (persist `financials_json`)
- `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx:410, 420` (UI consumer)

## Overview
- Priority: P1
- Status: pending
- Effort: ~45m

`calcInterest(loanAmount, rate) = loanAmount * rate` thiếu factor `termMonths/12`. Builder DOCX đã tự ghi đè đúng (line 168-174), nhưng:
1. `financials_json.interest` persist sai khi term ≠ 12 tháng.
2. UI loan-plan editor render trực tiếp `financials.interest` ở stats (line 410) → user thấy số sai.
3. `financials.totalCost` cũng sai (kéo theo).

## Key Insights
- `rate` trong `CalcFinancialsInput` đã là **annual decimal** (e.g. 0.09 = 9%/năm). Comment dòng 91 xác nhận.
- `termMonths` không có trong `CalcFinancialsInput` → phải thêm.
- `LoanPlanFinancials` type cần check xem có field `loanTermMonths` chưa, nếu chưa thì thêm vào input mà không cần thêm vào output (hoặc thêm để persist cho consistency).
- Builder ở `khcn-builder-loan-plan.ts:172` dùng `Number(financials.loanTerm) || 12` — name khác (`loanTerm` vs `termMonths`). Cần align.
- UI editor (`page.tsx`) đọc `financials.interest` → sau fix sẽ tự đúng vì service gọi `calcFinancials` rồi save vào `financials_json`.
- **QUYẾT ĐỊNH: Sửa luôn calculator.** Lý do: UI phụ thuộc, persisted JSON sai là silent bug. Mark `@deprecated` không giải quyết cho consumer hiện tại.
- **Backward compat:** mặc định `termMonths = 12` nếu không truyền → giữ nguyên hành vi cũ cho caller chưa update. Vẫn sửa caller chính (`loan-plan.service.ts`) để truyền đúng.

## Requirements
- `calcInterest` nhận thêm `termMonths`, mặc định 12.
- `calcFinancials` nhận thêm `termMonths` trong input, default 12, propagate xuống `calcInterest`.
- Tất cả callers truyền `termMonths` thực tế (đọc từ loan plan record).
- Builder `khcn-builder-loan-plan.ts` không cần đổi logic (đã đúng), nhưng kiểm tra alias `loanTerm` vs new field name.
- Không break test hiện có (chưa có test cho file này — Phase 03 sẽ thêm).

## Related Code Files
**Modify:**
- `src/lib/loan-plan/loan-plan-calculator.ts` — thêm `termMonths` vào `calcInterest` + `CalcFinancialsInput` + `calcFinancials`.
- `src/services/loan-plan.service.ts` — caller truyền `termMonths` từ plan record vào `calcFinancials`.
- (Có thể) `src/lib/loan-plan/loan-plan-types.ts` — kiểm tra và thêm `loanTermMonths` vào `LoanPlanFinancials` nếu cần persist.

**Read-only (reference):**
- `src/services/khcn-builder-loan-plan.ts` — verify alias compatibility.
- `src/app/report/customers/[id]/loan-plans/[planId]/page.tsx` — verify UI tự đúng sau fix.

**Create:** none
**Delete:** none

## Implementation Steps
1. Đọc `src/lib/loan-plan/loan-plan-types.ts` để hiểu shape `LoanPlanFinancials` và xác định tên field term hiện hữu (`loanTerm`? `termMonths`? `loanTermMonths`?).
2. Đọc `src/services/loan-plan.service.ts` quanh chỗ gọi `calcFinancials` (báo cáo nói L105, L138). Note tên field plan record chứa term.
3. Sửa `loan-plan-calculator.ts`:
   - `calcInterest(loanAmount, rate, termMonths = 12) → loanAmount * rate * termMonths / 12`
   - Thêm `termMonths?: number` vào `CalcFinancialsInput` (optional, default 12 inside function).
   - Trong `calcFinancials`: `const termMonths = input.termMonths ?? 12;` → `const interest = calcInterest(input.loanAmount, input.interestRate, termMonths);`
4. Sửa `loan-plan.service.ts`: tại 2 chỗ gọi `calcFinancials`, truyền `termMonths: plan.loan_term_months ?? plan.termMonths ?? 12` (dùng tên field thực tế từ plan record schema).
5. Verify `khcn-builder-loan-plan.ts:168-174` vẫn override khi `financials.interestCost` đã có giá trị (giữ ưu tiên cho computed field). Nếu sau Phase 02 `financials.interest` đã đúng, có thể remove logic recompute trong builder — NHƯNG defer sang Phase 2 để giảm scope.
6. `npx tsc --noEmit` verify type.
7. `npm run build` verify compile.
8. Manual smoke: tạo 1 loan plan term 36 tháng, kiểm tra UI editor stat "Lãi vay" hiển thị ≈ 3× giá trị cũ.

## Todo List
- [ ] Đọc `loan-plan-types.ts`
- [ ] Đọc `loan-plan.service.ts` (chỗ gọi calcFinancials)
- [ ] Sửa `calcInterest` signature + logic
- [ ] Sửa `CalcFinancialsInput` + `calcFinancials`
- [ ] Sửa caller `loan-plan.service.ts` (truyền termMonths)
- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
- [ ] Smoke test plan 36m UI

## Success Criteria
- `calcInterest(100_000_000, 0.09, 36)` trả `27_000_000` (3 năm × 9%).
- `calcInterest(100_000_000, 0.09)` (không truyền term) vẫn trả `9_000_000` (backward compat).
- UI loan plan editor hiển thị "Lãi vay" đúng cho plan term ≠ 12 tháng.
- Build + lint pass.

## Risk Assessment
- **Risk:** Caller khác (`khcn-builder-loan-plan.ts` etc.) đọc `financials.interest` rồi cộng/trừ → giá trị tăng lên 3-5x làm vỡ template. Mitigation: builder hiện đã có nhánh recompute riêng dùng `interestCost`, không phụ thuộc `interest`. Verify bằng grep `financials.interest` trước khi commit.
- **Risk:** Plan cũ trong DB có `financials_json.interest` value sai → UI vẫn hiển thị sai cho đến khi user save lại plan. Mitigation: chấp nhận, document trong commit msg. Re-save trigger recompute.
- **Risk:** Field name mismatch (`loanTerm` vs `termMonths` vs `loan_term_months`). Mitigation: đọc kỹ types + service trước khi sửa.

## Security Considerations
N/A — pure math.

## Next Steps
- Phase 03 (test) chặn hồi quy.
- Phase 2: review `khcn-builder-loan-plan.ts:168-174` recompute path — có thể remove sau khi calculator đúng (DRY).
- Phase 2: data fix script re-save existing plans để refresh `financials_json` (optional).

## Unresolved Questions
- Field name term trong `LoanPlanFinancials` / plan record là gì? (Resolve khi đọc types ở step 1).
- Có cần migration script update existing `financials_json` không? — Defer, chỉ cần re-save plan là tự fix.
