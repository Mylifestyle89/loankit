/**
 * KHCN builder: credit at Agribank (VBA) and other institutions (TCTD) data.
 */
import { fmtN } from "@/lib/report/format-number-vn";

type Data = Record<string, unknown>;

export type CreditEntry = {
  loan_term?: string | null; debt_amount?: string | null;
  loan_purpose?: string | null; repayment_source?: string | null;
};

// ── Helper: split credits by short/long term and emit prefixed debt breakdown ──

function emitCreditTermBreakdown(credits: CreditEntry[], prefix: string, data: Data): void {
  if (credits.length === 0) return;
  const shortTerm = credits.filter((c) => (c.loan_term ?? "").includes("ngắn"));
  const longTerm = credits.filter((c) => !(c.loan_term ?? "").includes("ngắn"));
  const sumDebt = (arr: CreditEntry[]) => arr.reduce((s, c) => s + (parseFloat(c.debt_amount ?? "0") || 0), 0);
  data[`${prefix}.Dư nợ ngắn hạn`] = sumDebt(shortTerm) || "";
  data[`${prefix}.Dư nợ trung dài hạn`] = sumDebt(longTerm) || "";
  data[`${prefix}.Mục đích ngắn hạn`] = shortTerm.map((c) => c.loan_purpose).filter(Boolean).join("; ") || "";
  data[`${prefix}.Mục đích trung dài hạn`] = longTerm.map((c) => c.loan_purpose).filter(Boolean).join("; ") || "";
  data[`${prefix}.Nguồn trả nợ`] = credits.map((c) => c.repayment_source).filter(Boolean).join("; ") || "";
}

// ── CreditAtAgribank (VBA = Vay vốn tại Agribank) ──

export function buildCreditAgribankData(
  credits: Array<{
    branch_name?: string | null; debt_group?: string | null;
    loan_term?: string | null; debt_amount?: string | null;
    loan_purpose?: string | null; repayment_source?: string | null;
  }>,
  data: Data,
) {
  data["VBA"] = credits.map((c, i) => ({
    STT: i + 1,
    "Tại chi nhánh/PGD": c.branch_name ?? "",
    "Thời hạn vay": c.loan_term ?? "",
    "Dư nợ": c.debt_amount ?? "",
    "Mục đích vay": c.loan_purpose ?? "",
    "Nguồn trả nợ": c.repayment_source ?? "",
    "Nhóm nợ": c.debt_group ?? "",
  }));
  const totalDebt = credits.reduce((s, c) => s + (parseFloat(c.debt_amount ?? "0") || 0), 0);
  if (totalDebt) data["HĐTD.Dư nợ của KH và NLQ tại Agribank"] = totalDebt;
  data["VBA.Tổng dư nợ"] = totalDebt || "";
  emitCreditTermBreakdown(credits, "VBA", data);
}

// ── CreditAtOther (TCTD = Tổ chức tín dụng khác) ──

export function buildCreditOtherData(
  credits: Array<{
    institution_name?: string | null; debt_group?: string | null;
    loan_term?: string | null; debt_amount?: string | null;
    loan_purpose?: string | null; repayment_source?: string | null;
  }>,
  data: Data,
) {
  const first = credits[0];
  if (first) {
    data["TCTD.Tên TCTD"] = first.institution_name ?? "";
    data["TCTD.Nhóm nợ"] = first.debt_group ?? "";
    data["TCTD.Thời hạn vay"] = first.loan_term ?? "";
    data["TCTD.Dư nợ"] = first.debt_amount ?? "";
    data["TCTD.Mục đích vay"] = first.loan_purpose ?? "";
    data["TCTD.Nguồn trả nợ"] = first.repayment_source ?? "";
  }
  const totalDebt = credits.reduce((s, c) => s + (parseFloat(c.debt_amount ?? "0") || 0), 0);
  if (totalDebt) data["HĐTD.Dư nợ tại TCTD khác"] = totalDebt;
  data["TCTD.Tổng dư nợ"] = totalDebt || "";
  emitCreditTermBreakdown(credits, "TCTD", data);
}
