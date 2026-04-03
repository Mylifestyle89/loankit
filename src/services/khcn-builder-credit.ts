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
  // Flat fields from first entry (backward compat)
  const first = credits[0];
  if (first) {
    data["TCTD.Tên TCTD"] = first.institution_name ?? "";
    data["TCTD.Nhóm nợ"] = first.debt_group ?? "";
    data["TCTD.Thời hạn vay"] = first.loan_term ?? "";
    data["TCTD.Dư nợ"] = first.debt_amount ?? "";
    data["TCTD.Mục đích vay"] = first.loan_purpose ?? "";
    data["TCTD.Nguồn trả nợ"] = first.repayment_source ?? "";
  }
  // Loop array for multi-TCTD templates [#TCTD]...[/TCTD]
  data["TCTD"] = credits.map((c, i) => ({
    STT: i + 1,
    "Tên TCTD": c.institution_name ?? "",
    "Nhóm nợ": c.debt_group ?? "",
    "Thời hạn vay": c.loan_term ?? "",
    "Dư nợ": c.debt_amount ?? "",
    "Mục đích vay": c.loan_purpose ?? "",
    "Nguồn trả nợ": c.repayment_source ?? "",
  }));
  const totalDebt = credits.reduce((s, c) => s + (parseFloat(c.debt_amount ?? "0") || 0), 0);
  if (totalDebt) data["HĐTD.Dư nợ tại TCTD khác"] = totalDebt;
  data["TCTD.Tổng dư nợ"] = totalDebt || "";
  emitCreditTermBreakdown(credits, "TCTD", data);
}

// ── Unified credit loop: [#DUNỢ]...[/DUNỢ] merges Agribank + all TCTD ──

export function buildUnifiedCreditLoop(data: Data): void {
  const loop: Record<string, unknown>[] = [];

  // Agribank entries (from VBA array already built)
  const vbaArray = data["VBA"] as Array<Record<string, unknown>> | undefined;
  if (vbaArray && vbaArray.length > 0) {
    const branchName = vbaArray[0]["Tại chi nhánh/PGD"] ?? "";
    loop.push({
      "Tên tổ chức": branchName ? `Agribank ${branchName}` : "Agribank",
      "Tổng dư nợ": data["VBA.Tổng dư nợ"] ?? "",
      "Nhóm nợ": vbaArray[0]["Nhóm nợ"] ?? "",
      "Dư nợ ngắn hạn": data["VBA.Dư nợ ngắn hạn"] ?? "",
      "Dư nợ trung dài hạn": data["VBA.Dư nợ trung dài hạn"] ?? "",
      "Mục đích ngắn hạn": data["VBA.Mục đích ngắn hạn"] ?? "",
      "Mục đích trung dài hạn": data["VBA.Mục đích trung dài hạn"] ?? "",
      "Nguồn trả nợ": data["VBA.Nguồn trả nợ"] ?? "",
    });
  }

  // Each TCTD entry separately
  const tctdArray = data["TCTD"] as Array<Record<string, unknown>> | undefined;
  if (tctdArray) {
    for (const tctd of tctdArray) {
      loop.push({
        "Tên tổ chức": tctd["Tên TCTD"] ?? "",
        "Tổng dư nợ": tctd["Dư nợ"] ?? "",
        "Nhóm nợ": tctd["Nhóm nợ"] ?? "",
        "Dư nợ ngắn hạn": (tctd["Thời hạn vay"] as string ?? "").includes("ngắn") ? tctd["Dư nợ"] : "",
        "Dư nợ trung dài hạn": !(tctd["Thời hạn vay"] as string ?? "").includes("ngắn") ? tctd["Dư nợ"] : "",
        "Mục đích ngắn hạn": (tctd["Thời hạn vay"] as string ?? "").includes("ngắn") ? tctd["Mục đích vay"] : "",
        "Mục đích trung dài hạn": !(tctd["Thời hạn vay"] as string ?? "").includes("ngắn") ? tctd["Mục đích vay"] : "",
        "Nguồn trả nợ": tctd["Nguồn trả nợ"] ?? "",
      });
    }
  }

  data["DUNỢ"] = loop;
}
