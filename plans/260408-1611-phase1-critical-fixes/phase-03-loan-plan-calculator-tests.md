# Phase 03 — Loan-plan Calculator Tests

## Context Links
- `plans/reports/code-reviewer-260408-1556-core.md` § I10
- `src/lib/loan-plan/loan-plan-calculator.ts`
- `vitest.config.ts` — test include pattern: `src/**/*.test.ts`
- Existing test fixtures: `src/lib/report/__tests__/field-calc.test.ts`, `src/services/__tests__/khcn-report-data-builders.test.ts`
- Convention: `__tests__/` folder sibling to source file + `*.test.ts`

## Overview
- Priority: P1
- Status: pending
- Effort: ~1h

Hiện tại `src/lib/loan-plan/` có 0 tests. Phase này viết test tối thiểu cho `loan-plan-calculator.ts` để chặn hồi quy bug C3 và làm safety net cho các thay đổi sau.

## Key Insights
- Phase 02 phải xong trước — test viết theo signature mới (`calcInterest(loanAmount, rate, termMonths)`).
- Project dùng Vitest, pattern `__tests__/*.test.ts`, globals enabled (`describe`/`it`/`expect` không cần import).
- Focus vào `calcInterest` + `calcFinancials` (core của fix C3). `calcRepaymentSchedule` và `calcCategoryRevenue` có thể test nhẹ — không phải mục tiêu cấp cứu, nhưng thêm vài case cơ bản để build foundation.
- KISS: không mock, không fixture file, chỉ test pure function.

## Requirements
- File: `src/lib/loan-plan/__tests__/loan-plan-calculator.test.ts`
- Dùng Vitest globals (`describe`, `it`, `expect`).
- Cover minimum: C3 regression cases + edge cases liệt kê dưới.
- Pass `npm test` / `npx vitest run`.

## Test Cases

### `calcInterest`
1. **1 năm standard**: `calcInterest(100_000_000, 0.09, 12) === 9_000_000`
2. **Backward compat default**: `calcInterest(100_000_000, 0.09) === 9_000_000` (default 12)
3. **24 tháng**: `calcInterest(100_000_000, 0.09, 24) === 18_000_000`
4. **36 tháng**: `calcInterest(100_000_000, 0.09, 36) === 27_000_000`
5. **60 tháng**: `calcInterest(100_000_000, 0.09, 60) === 45_000_000`
6. **6 tháng (partial year)**: `calcInterest(100_000_000, 0.09, 6) === 4_500_000`
7. **Edge: rate = 0**: `calcInterest(100_000_000, 0, 36) === 0`
8. **Edge: loanAmount = 0**: `calcInterest(0, 0.09, 36) === 0`
9. **Edge: termMonths = 0**: `calcInterest(100_000_000, 0.09, 0) === 0`

### `calcTotalDirectCost`
1. Empty array → 0
2. Sum của `[{amount: 100}, {amount: 200}, {amount: 50}]` = 350

### `calcFinancials`
1. **Happy path 12 tháng**:
   - Input: costItems 1 item 10M, revenue 50M, loanAmount 100M, interestRate 0.09, turnoverCycles 1, tax 1M, termMonths 12
   - Expect: `interest === 9_000_000`, `totalIndirectCost === 10_000_000`, `totalCost === 20_000_000`, `profit === 30_000_000`
2. **36 tháng regression C3**:
   - Same input nhưng `termMonths: 36`
   - Expect: `interest === 27_000_000`, `totalCost === 38_000_000`
3. **turnoverCycles fallback**: `turnoverCycles: 0` → `loanNeed` vẫn finite (dùng 1 fallback).
4. **Counterpart capital**: `loanNeed - loanAmount` đúng dấu.

### `calcDepreciation` (quick guard)
1. `calcDepreciation(1_000_000_000, 10, 5) === 2_000_000_000` (rounded)
2. Edge `years = 0` → 0.

### `calcRepaymentSchedule` (smoke only, optional — không block Phase 1 nếu hết time)
1. `termMonths: 36, freq: 12, loanAmount: 300M` → 3 rows, tổng principal === 300M.
2. Last-period adjustment: `loanAmount: 100M, freq: 12, term: 36` (100M/3 không chia hết) → sum principal === 100M exact.

## Related Code Files
**Create:**
- `src/lib/loan-plan/__tests__/loan-plan-calculator.test.ts`

**Read-only:**
- `src/lib/loan-plan/loan-plan-calculator.ts`
- `src/lib/loan-plan/loan-plan-types.ts` (để biết `CostItem` shape)

**Modify:** none

**Delete:** none

## Implementation Steps
1. Đọc `loan-plan-types.ts` để biết exact shape của `CostItem` (fields: `name`, `amount`, `unit`, ...).
2. Tạo folder `src/lib/loan-plan/__tests__/`.
3. Tạo file `loan-plan-calculator.test.ts`.
4. Import functions cần test từ `../loan-plan-calculator`. Vitest globals không cần import `describe/it/expect`.
5. Viết `describe` blocks theo từng function (calcInterest, calcTotalDirectCost, calcFinancials, calcDepreciation).
6. Mỗi case dùng `it("should...", () => { expect(...).toBe(...) })`.
7. Chạy `npx vitest run src/lib/loan-plan` — expect all green.
8. Chạy full `npx vitest run` để đảm bảo không break test khác.
9. Nếu còn time: thêm `calcRepaymentSchedule` smoke cases.

## Todo List
- [ ] Đọc `loan-plan-types.ts` (CostItem shape)
- [ ] Tạo `src/lib/loan-plan/__tests__/loan-plan-calculator.test.ts`
- [ ] Viết `calcInterest` cases (9)
- [ ] Viết `calcTotalDirectCost` cases (2)
- [ ] Viết `calcFinancials` cases (4)
- [ ] Viết `calcDepreciation` cases (2)
- [ ] (Optional) `calcRepaymentSchedule` smoke
- [ ] `npx vitest run src/lib/loan-plan` all green
- [ ] `npx vitest run` full suite all green

## Success Criteria
- File test tồn tại, tất cả cases pass.
- Nếu ai revert Phase 02 (`calcInterest` bỏ `termMonths`), test 36/60 tháng FAIL — chứng minh regression guard work.
- Full `npx vitest run` không broken test nào.

## Risk Assessment
- **Risk:** Shape `CostItem` khác kỳ vọng → compile fail. Mitigation: đọc types trước.
- **Risk:** Rounding khác expected value do `Math.round` trong `calcDepreciation`. Mitigation: chọn input chia hết (1B × 10 / 5 = 2B, exact).
- **Risk:** `calcRepaymentSchedule` last-period adjustment phức tạp → test flaky. Mitigation: mark smoke case optional, chỉ assert tổng principal chứ không từng row.

## Security Considerations
N/A — tests pure functions, no IO.

## Next Steps
- Phase 2: mở rộng test cho `calcRepaymentSchedule` full coverage (preferential rate, rounding modes, freq 1/3/6/12) — per report I10.
- Phase 2: test `mergeAdjacentRuns` + `parseDocxPlaceholdersFromBuffer` (khác file, khác scope).

## Unresolved Questions
- Có cần tích hợp vào CI (github actions) chạy `npx vitest run` không? — hiện repo đã có test khác, giả định CI đã chạy.
