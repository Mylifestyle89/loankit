// Regression + unit tests cho loan-plan-calculator.
// Đảm bảo bug C3 (calcInterest thiếu factor termMonths) không quay lại.

import { describe, it, expect } from "vitest";
import {
  calcInterest,
  calcTotalDirectCost,
  calcFinancials,
  calcDepreciation,
  calcRepaymentSchedule,
  type CalcFinancialsInput,
} from "../loan-plan-calculator";
import type { CostItem } from "../loan-plan-types";

// Helper: tạo CostItem đơn giản với amount (các field khác không ảnh hưởng math).
function cost(amount: number, name = "item"): CostItem {
  return { name, unit: "đ", qty: 1, unitPrice: amount, amount };
}

describe("calcInterest", () => {
  it("1 năm standard: 100M × 9% × 12/12 = 9M", () => {
    expect(calcInterest(100_000_000, 0.09, 12)).toBe(9_000_000);
  });

  it("backward compat: omit termMonths mặc định 12 tháng", () => {
    expect(calcInterest(100_000_000, 0.09)).toBe(9_000_000);
  });

  it("24 tháng: lãi gấp đôi 1 năm", () => {
    expect(calcInterest(100_000_000, 0.09, 24)).toBe(18_000_000);
  });

  it("36 tháng: lãi gấp ba — regression guard cho C3", () => {
    expect(calcInterest(100_000_000, 0.09, 36)).toBe(27_000_000);
  });

  it("60 tháng: lãi gấp năm", () => {
    expect(calcInterest(100_000_000, 0.09, 60)).toBe(45_000_000);
  });

  it("6 tháng (partial year): 100M × 9% × 6/12 = 4.5M", () => {
    expect(calcInterest(100_000_000, 0.09, 6)).toBe(4_500_000);
  });

  it("rate 0 → lãi 0", () => {
    expect(calcInterest(100_000_000, 0, 36)).toBe(0);
  });

  it("loanAmount 0 → lãi 0", () => {
    expect(calcInterest(0, 0.09, 36)).toBe(0);
  });

  it("termMonths 0 → fallback 12 (tránh chia 0)", () => {
    // Hàm hiện tại guard termMonths<=0 về 12 để không trả về 0 gây hiểu lầm.
    expect(calcInterest(100_000_000, 0.09, 0)).toBe(9_000_000);
  });
});

describe("calcTotalDirectCost", () => {
  it("empty array → 0", () => {
    expect(calcTotalDirectCost([])).toBe(0);
  });

  it("sum nhiều item", () => {
    expect(calcTotalDirectCost([cost(100), cost(200), cost(50)])).toBe(350);
  });
});

describe("calcFinancials", () => {
  const base: CalcFinancialsInput = {
    costItems: [cost(10_000_000)],
    revenue: 50_000_000,
    loanAmount: 100_000_000,
    interestRate: 0.09,
    turnoverCycles: 1,
    tax: 1_000_000,
  };

  it("happy path 12 tháng (default)", () => {
    const r = calcFinancials(base);
    expect(r.interest).toBe(9_000_000);
    expect(r.totalIndirectCost).toBe(10_000_000); // interest + tax
    expect(r.totalCost).toBe(20_000_000); // direct + indirect
    expect(r.profit).toBe(30_000_000); // revenue - totalCost
  });

  it("36 tháng regression C3: interest + totalCost phải scale theo term", () => {
    const r = calcFinancials({ ...base, termMonths: 36 });
    expect(r.interest).toBe(27_000_000);
    expect(r.totalIndirectCost).toBe(28_000_000);
    expect(r.totalCost).toBe(38_000_000);
    expect(r.profit).toBe(12_000_000);
  });

  it("turnoverCycles 0 → loanNeed vẫn finite (fallback 1)", () => {
    const r = calcFinancials({ ...base, turnoverCycles: 0 });
    expect(Number.isFinite(r.loanNeed)).toBe(true);
    expect(r.loanNeed).toBe(10_000_000); // totalDirectCost / 1
  });

  it("counterpartCapital = loanNeed - loanAmount", () => {
    const r = calcFinancials({ ...base, loanAmount: 5_000_000 });
    expect(r.counterpartCapital).toBe(r.loanNeed - 5_000_000);
  });
});

describe("calcDepreciation", () => {
  it("1B × 10 sào / 5 năm = 2B", () => {
    expect(calcDepreciation(1_000_000_000, 10, 5)).toBe(2_000_000_000);
  });

  it("years = 0 → 0 (tránh chia 0)", () => {
    expect(calcDepreciation(1_000_000_000, 10, 0)).toBe(0);
  });
});

describe("calcRepaymentSchedule (smoke)", () => {
  it("36 tháng, freq 12, 300M → 3 năm, tổng principal = 300M", () => {
    const rows = calcRepaymentSchedule({
      loanAmount: 300_000_000,
      termMonths: 36,
      standardRate: 0.09,
      annualIncome: 200_000_000,
    });
    expect(rows.length).toBe(3);
    const sumPrincipal = rows.reduce((s, r) => s + r.principal, 0);
    expect(sumPrincipal).toBe(300_000_000);
  });

  it("last-period adjustment: 100M/3 không chia hết → kỳ cuối tự điều chỉnh", () => {
    const rows = calcRepaymentSchedule({
      loanAmount: 100_000_000,
      termMonths: 36,
      standardRate: 0.09,
      annualIncome: 80_000_000,
    });
    const sumPrincipal = rows.reduce((s, r) => s + r.principal, 0);
    expect(sumPrincipal).toBe(100_000_000);
  });
});
