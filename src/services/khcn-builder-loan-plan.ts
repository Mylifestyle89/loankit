/**
 * KHCN builder: loan plan (PA = Phương án) extended data.
 */
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";
import { fmtN } from "@/lib/report/format-number-vn";

type Data = Record<string, unknown>;

// ── Extended Loan Plan (PA) cost items ──

export function buildLoanPlanExtendedData(
  plan: {
    name: string; financials_json: string;
    cost_items_json: string; revenue_items_json: string;
  } | null,
  data: Data,
) {
  if (!plan) return;

  let financials: Record<string, unknown>;
  try { financials = JSON.parse(plan.financials_json || "{}"); }
  catch { return; }

  // Extended PA flat fields
  data["PA.Mục đích vay"] = financials.purpose ?? "";
  data["PA.Thời hạn vay"] = financials.loanTerm ?? "";
  // Format interest rate: 0.09 → "9%/năm"
  const rawRate = financials.interestRate;
  data["PA.Lãi suất vay"] = typeof rawRate === "number" && rawRate > 0
    ? `${(rawRate < 1 ? rawRate * 100 : rawRate).toFixed(2).replace(".", ",")}%/năm`
    : rawRate ?? "";
  data["PA.Lãi vay NH"] = fmtN(financials.interestCost);
  data["PA.Lãi vay"] = fmtN(financials.interestCost);
  data["PA.Thu nhập"] = fmtN(financials.income ?? financials.revenue);
  data["PA.Sản lượng"] = financials.yield ?? "";
  data["PA.Số sào đất"] = financials.landArea ?? "";
  data["PA.Địa chỉ đất NN"] = financials.farmAddress ?? "";
  data["PA.Số tiền vay bằng chữ"] = financials.loanAmount
    ? numberToVietnameseWords(financials.loanAmount as number)
    : "";
  data["PA.Tổng nhu cầu vốn bằng chữ"] = financials.totalCost
    ? numberToVietnameseWords(financials.totalCost as number)
    : "";
  data["PA.Số tiền đặt cọc"] = fmtN(financials.deposit);
  data["PA.Số HĐTD cũ"] = financials.oldContractNumber ?? "";
  data["PA.Ngày HĐTD cũ"] = financials.oldContractDate ?? "";
  data["PA.Số tiền hợp đồng cung ứng"] = fmtN(financials.supplyContractAmount);
  data["PA.Số tiền hợp đồng cung ứng bằng chữ"] = financials.supplyContractAmount
    ? numberToVietnameseWords(financials.supplyContractAmount as number)
    : "";

  // Consolidated flat PA.* financials (single source of truth)
  data["PA.Tên phương án"] = plan.name;
  data["PA.Tổng nhu cầu vốn"] = fmtN(financials.totalCost);
  data["PA.Số tiền vay"] = fmtN(financials.loanAmount);
  data["PA.Vốn đối ứng"] = fmtN(financials.counterpartCapital);
  // Auto-calculate counterpart ratio: vốn đối ứng / tổng nhu cầu vốn
  const cpCapital = Number(financials.counterpartCapital) || 0;
  // Ratio will be recalculated after totalCostAll is known (see below)
  // Initial fallback uses raw financials.totalCost
  const initialTotalCost = Number(financials.totalCost) || Number(financials.loanNeed) || 0;
  function calcRatioStr(total: number): string {
    const raw = financials.counterpartRatio ?? (total > 0 ? cpCapital / total : 0);
    const n = typeof raw === "string" ? parseFloat(raw) : Number(raw) || 0;
    if (n <= 0) return "";
    return `${(n < 1 ? n * 100 : n).toFixed(2).replace(".", ",")}%`;
  }
  data["PA.Tỷ lệ vốn đối ứng"] = calcRatioStr(initialTotalCost);
  // Tỷ lệ vốn tự có dùng chi phí trực tiếp — sẽ recalculate sau khi có cost items
  data["PA.Tỷ lệ vốn tự có"] = calcRatioStr(Number(financials.totalDirectCost) || initialTotalCost);
  data["PA.Tổng doanh thu dự kiến"] = fmtN(financials.revenue);
  data["PA.Tổng chi phí dự kiến"] = fmtN(financials.totalExpenses ?? financials.totalCost);
  data["PA.Lợi nhuận dự kiến"] = fmtN(financials.profit);
  data["PA.Tổng chi phí trực tiếp"] = fmtN(financials.totalDirectCost);
  data["PA.Tổng chi phí gián tiếp"] = fmtN(financials.totalIndirectCost);
  data["PA.Tổng chi phí"] = fmtN(financials.totalCost);
  data["PA.Thuế"] = fmtN(financials.tax);
  data["PA.Nhu cầu vốn vay"] = fmtN(financials.loanNeed ?? financials.loanAmount);
  data["PA.Vòng quay vốn"] = financials.turnoverCycles ?? "";

  // Build separate loop arrays + flat summary placeholders for cost/revenue table
  try {
    const costItems: Array<{ name: string; unit?: string; qty?: number; unitPrice?: number; unit_price?: number; amount?: number }> =
      JSON.parse(plan.cost_items_json || "[]");
    const revenueItems: Array<{ description: string; unit?: string; qty?: number; unitPrice?: number; unit_price?: number; amount?: number }> =
      JSON.parse(plan.revenue_items_json || "[]");

    // Row helper: add aliases for different template placeholder names
    const row = (r: Record<string, unknown>) => {
      const label = r["Hạng mục"] ?? "";
      return { ...r, "Mô tả": label, "KHOẢN MỤC": label, "Khoản mục": label, "Danh mục": label };
    };

    // PA_CHIPHI = loop chỉ các khoản chi phí trực tiếp (cost items)
    // PA_CHIPHI: cost items loop
    data["PA_CHIPHI"] = costItems.map((c, i) => row({
      STT: i + 1, "Hạng mục": c.name,
      ĐVT: c.unit ?? "",
      "Đơn giá": fmtN(c.unitPrice ?? c.unit_price),
      "Số lượng": fmtN(c.qty),
      "Thành tiền": fmtN(c.amount),
    }));

    // PA_DOANHTHU: revenue items loop
    data["PA_DOANHTHU"] = revenueItems.map((r, i) => row({
      STT: i + 1, "Hạng mục": r.description,
      ĐVT: r.unit ?? "đ",
      "Đơn giá": fmtN(r.unitPrice ?? r.unit_price),
      "Số lượng": fmtN(r.qty),
      "Thành tiền": fmtN(r.amount),
    }));

    // Calculate totals for flat placeholders (fixed rows in template)
    const totalDirectCost = costItems.reduce((s, c) => s + (c.amount ?? 0), 0);
    // Auto-calculate interest cost: rate × loanAmount × term(months)/12
    let interestCost = Number(financials.interestCost) || 0;
    if (!interestCost && rawRate && financials.loanAmount) {
      const rate = (rawRate as number) < 1 ? (rawRate as number) : (rawRate as number) / 100;
      const months = Number(financials.loanTerm) || 12;
      interestCost = Math.round(rate * Number(financials.loanAmount) * months / 12);
    }
    const tax = Number(financials.tax) || 0;
    const totalIndirectCost = interestCost + tax;
    const totalCostAll = totalDirectCost + totalIndirectCost;
    const totalRevenue = revenueItems.reduce((s, r) => s + (r.amount ?? 0), 0);
    const profit = totalRevenue - totalCostAll;

    // Format interest rate
    const rateStr = typeof rawRate === "number" && (rawRate as number) > 0
      ? `${((rawRate as number) < 1 ? (rawRate as number) * 100 : (rawRate as number)).toFixed(2).replace(".", ",")}%/năm`
      : "";

    // Flat placeholders for fixed rows in template
    data["PA.Tổng chi phí"] = fmtN(totalCostAll);
    data["PA.Tổng chi phí trực tiếp"] = fmtN(totalDirectCost);
    data["PA.Tổng chi phí gián tiếp"] = fmtN(totalIndirectCost);
    data["PA.Lãi vay NH"] = fmtN(interestCost);
    data["PA.Lãi vay"] = fmtN(interestCost);
    data["PA.LS vay"] = rateStr; // lãi suất format cho cột đơn giá
    data["PA.Thuế"] = fmtN(tax);
    data["PA.Tổng doanh thu dự kiến"] = fmtN(totalRevenue);
    data["PA.Lợi nhuận dự kiến"] = fmtN(profit);
    // Tổng nhu cầu vốn = tổng chi phí (trực tiếp + gián tiếp)
    if (totalCostAll > 0) {
      data["PA.Tổng nhu cầu vốn"] = fmtN(totalCostAll);
      data["PA.Tổng nhu cầu vốn bằng chữ"] = numberToVietnameseWords(totalCostAll);
      // Recalculate ratio with actual totals
      data["PA.Tỷ lệ vốn đối ứng"] = calcRatioStr(totalCostAll);
      // Tỷ lệ vốn tự có = vốn đối ứng / tổng chi phí TRỰC TIẾP (không gồm gián tiếp)
      data["PA.Tỷ lệ vốn tự có"] = calcRatioStr(totalDirectCost);
    }
  } catch {
    data["PA_CHIPHI"] = [];
    data["PA_DOANHTHU"] = [];
  }
}
