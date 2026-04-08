/**
 * KHCN builder: loan plan (PA = Phương án) extended data.
 */
import { numberToVietnameseWords } from "@/lib/number-to-vietnamese-words";
import { fmtN } from "@/lib/report/format-number-vn";
import { calcDepreciation, calcRepaymentSchedule } from "@/lib/loan-plan/loan-plan-calculator";
import { buildTieuDungLoanPlanData } from "./khcn-builder-loan-plan-tieu-dung";

type Data = Record<string, unknown>;

// ── Extended Loan Plan (PA) cost items ──

export function buildLoanPlanExtendedData(
  plan: {
    name: string; financials_json: string;
    cost_items_json: string; revenue_items_json: string;
    loan_method?: string;
  } | null,
  data: Data,
) {
  if (!plan) return;

  let financials: Record<string, unknown>;
  try { financials = JSON.parse(plan.financials_json || "{}"); }
  catch { return; }

  // Consumer loan — delegate to tiêu dùng builder and skip SXKD logic
  if (plan.loan_method === "tieu_dung") {
    buildTieuDungLoanPlanData(financials, data);
    data["PA.Số tiền vay bằng chữ"] = financials.loanAmount
      ? numberToVietnameseWords(financials.loanAmount as number) : "";
    return;
  }

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
  data["PA.Tổng nhu cầu vốn bằng chữ"] = financials.totalDirectCost
    ? numberToVietnameseWords(financials.totalDirectCost as number)
    : "";
  // PA.Số tiền đặt cọc & PA.Số tiền hợp đồng cung ứng: recalculated after cost items (see below)
  data["PA.Số HĐTD cũ"] = financials.oldContractNumber ?? "";
  data["PA.Ngày HĐTD cũ"] = financials.oldContractDate ?? "";

  // ── Khấu hao nhà kính (trung dài hạn) ──
  const depYears = Number(financials.depreciation_years) || 0;
  const assetPrice = Number(financials.asset_unit_price) || 0;
  const landSau = Number(financials.land_area_sau) || 0;
  const depreciation = calcDepreciation(assetPrice, landSau, depYears);

  data["PA.Khấu hao nhà kính"] = fmtN(depreciation);
  data["PA.Số năm khấu hao"] = depYears || "";
  data["PA.Đơn giá nhà kính/sào"] = fmtN(assetPrice);
  if (landSau) data["PA.Số sào đất"] = fmtN(landSau);
  data["PA.Số HĐ thi công"] = financials.construction_contract_no ?? "";
  // Convert Excel serial date if needed (e.g. 46073 → "15/02/2026")
  const rawDate = financials.construction_contract_date ?? "";
  const numDate = Number(rawDate);
  if (numDate > 30000 && numDate < 100000) {
    const d = new Date((numDate - 25569) * 86400000);
    data["PA.Ngày HĐ thi công"] = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } else {
    data["PA.Ngày HĐ thi công"] = rawDate;
  }
  // Đánh giá tín dụng
  data["HĐTD.Tính hợp pháp"] = financials.legal_assessment ?? "";
  data["HĐTD.Thị trường NVL"] = financials.market_input ?? "";
  data["HĐTD.Thị trường tiêu thụ SP"] = financials.market_output ?? "";
  data["HĐTD.Năng lực về nhân công"] = financials.labor_capability ?? "";
  data["HĐTD.Năng lực về máy móc"] = financials.machinery_capability ?? "";
  data["HĐTD.Các yếu tố khác"] = financials.other_factors ?? "";

  // ── HĐTD vốn đối ứng breakdown (fallback khi chưa có loan data) ──
  // Vốn bằng tiền = vốn đối ứng (default toàn bộ bằng tiền)
  const counterpartAmt = Math.max((assetPrice * landSau) - (Number(financials.loanAmount) || 0), 0);
  if (!data["HĐTD.Tr.đó: Vốn bằng tiền"]) data["HĐTD.Tr.đó: Vốn bằng tiền"] = fmtN(counterpartAmt);
  if (!data["HĐTD.Vốn bằng sức lao động"]) data["HĐTD.Vốn bằng sức lao động"] = "";
  if (!data["HĐTD.Vốn bằng tài sản khác"]) data["HĐTD.Vốn bằng tài sản khác"] = "";
  if (!data["HĐTD.Vốn vay TCTD khác"]) data["HĐTD.Vốn vay TCTD khác"] = "";

  // Consolidated flat PA.* financials (single source of truth)
  data["PA.Tên phương án"] = plan.name;
  data["PA.Tổng nhu cầu vốn"] = fmtN(financials.totalDirectCost);
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
  data["PA.Phân tích vòng quay vốn"] = financials.turnover_analysis ?? "";

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

    // PA_CHIPHI: cost items loop — skip rows without name or amount
    const validCostItems = costItems.filter((c) => c.name?.trim() && (c.amount || c.qty));
    data["PA_CHIPHI"] = validCostItems.map((c, i) => row({
      STT: i + 1, "Hạng mục": c.name,
      ĐVT: c.unit ?? "",
      "Đơn giá": fmtN(c.unitPrice ?? c.unit_price),
      "Số lượng": fmtN(c.qty),
      "Thành tiền": fmtN(c.amount),
    }));

    // Flat PA.<name>_DG/_SL/_TT placeholders for fixed-row templates (HĐ cung ứng, BB giao nhận)
    for (const c of costItems) {
      if (!c.name) continue;
      data[`PA.${c.name}_DG`] = fmtN(c.unitPrice ?? c.unit_price);
      data[`PA.${c.name}_SL`] = fmtN(c.qty);
      data[`PA.${c.name}_TT`] = fmtN(c.amount);
    }

    // PA_DOANHTHU: revenue items loop — skip rows without description or amount
    const validRevenueItems = revenueItems.filter((r) => r.description?.trim() && (r.amount || r.qty));
    data["PA_DOANHTHU"] = validRevenueItems.map((r, i) => row({
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
    // Trung dài hạn: gián tiếp = khấu hao + lãi vay + thuế
    // Ngắn hạn: gián tiếp = lãi vay + thuế (không có khấu hao)
    const isTrungDai = plan.loan_method === "trung_dai";
    const totalIndirectCost = isTrungDai
      ? (depreciation + interestCost + tax)
      : (interestCost + tax);
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
    // PA.Lãi vay NH và PA.Lãi vay: cùng giá trị lãi dự kiến (template cũ dùng một trong hai)
    data["PA.Lãi vay NH"] = fmtN(interestCost);
    data["PA.Lãi vay"] = fmtN(interestCost);
    data["PA.LS vay"] = rateStr; // lãi suất format cho cột đơn giá
    data["PA.Thuế"] = fmtN(tax);
    data["PA.Tổng doanh thu dự kiến"] = fmtN(totalRevenue);
    data["PA.Lợi nhuận dự kiến"] = fmtN(profit);
    // HĐ cung ứng: tổng = chỉ 9 khoản vật tư (không gồm xử lý đất, tưới, công lao động)
    const SUPPLY_ITEMS = ["Cây giống", "Phân hữu cơ", "Đạm", "Lân", "KaLi", "Phân vi sinh", "NPK", "Vôi", "Thuốc BVTV"];
    const supplyTotal = costItems
      .filter(c => SUPPLY_ITEMS.includes(c.name))
      .reduce((s, c) => s + (c.amount ?? 0), 0);
    data["PA.Số tiền hợp đồng cung ứng"] = fmtN(supplyTotal);
    data["PA.Số tiền hợp đồng cung ứng bằng chữ"] = supplyTotal
      ? numberToVietnameseWords(supplyTotal) : "";
    const loanAmt = Number(financials.loanAmount) || 0;
    const depositAmt = Math.max(supplyTotal - loanAmt, 0);
    data["PA.Số tiền đặt cọc"] = fmtN(depositAmt);
    data["PA.Số tiền đặt cọc bằng chữ"] = depositAmt
      ? numberToVietnameseWords(depositAmt) : "";
    // Tổng nhu cầu vốn:
    //   trung_dai nhà kính = giá trị tài sản (đơn giá × diện tích)
    //   ngắn hạn/hạn mức   = tổng CPTT / vòng quay vốn
    const assetValue = (Number(financials.asset_unit_price) || 0) * (Number(financials.land_area_sau) || 0);
    const turnoverCycles = Number(financials.turnoverCycles) || 1;
    const capitalNeed = (assetValue > 0)
      ? assetValue
      : (turnoverCycles > 1 ? Math.round(totalDirectCost / turnoverCycles) : totalDirectCost);
    if (capitalNeed > 0) {
      data["PA.Tổng nhu cầu vốn"] = fmtN(capitalNeed);
      data["PA.Tổng nhu cầu vốn bằng chữ"] = numberToVietnameseWords(capitalNeed);
      // Vốn đối ứng = Nhu cầu vốn - Số tiền vay
      const counterpart = capitalNeed - loanAmt;
      data["PA.Vốn đối ứng"] = fmtN(counterpart);
      data["PA.Vốn đối ứng bằng chữ"] = counterpart > 0 ? numberToVietnameseWords(counterpart) : "";
      // Tỷ lệ
      data["PA.Tỷ lệ vốn đối ứng"] = capitalNeed > 0
        ? `${((counterpart / capitalNeed) * 100).toFixed(2).replace(".", ",")}%` : "";
      data["PA.Tỷ lệ vốn tự có"] = calcRatioStr(totalDirectCost);
      // Fallback HĐTD.* versions (loan builder sets these from DB, but plan data takes over if present)
      if (!data["HĐTD.Tổng nhu cầu vốn"]) data["HĐTD.Tổng nhu cầu vốn"] = fmtN(capitalNeed);
      if (!data["HĐTD.TNCV bằng chữ"]) data["HĐTD.TNCV bằng chữ"] = numberToVietnameseWords(capitalNeed);
      if (!data["HĐTD.Vốn đối ứng"]) data["HĐTD.Vốn đối ứng"] = fmtN(counterpart);
      if (!data["HĐTD.Tỷ lệ vốn đối ứng"]) {
        data["HĐTD.Tỷ lệ vốn đối ứng"] = capitalNeed > 0
          ? `${((counterpart / capitalNeed) * 100).toFixed(2).replace(".", ",")}%` : "";
      }
    }
    // ── Bảng trả nợ theo năm (PA_TRANO) — vay trung dài hạn ──
    const termMonths = Number(financials.term_months || financials.loanTerm) || 0;
    const stdRate = Number(financials.interestRate) || 0;
    const prefRate = Number(financials.preferential_rate) || stdRate;
    const annualIncome = profit + depreciation;

    const repaymentFreq = Number(financials.repayment_frequency) || 12;
    const rounding = (financials.principal_rounding === "up_100k" || financials.principal_rounding === "down_100k")
      ? financials.principal_rounding : "none";
    const repaymentRows = calcRepaymentSchedule({
      loanAmount: loanAmt, termMonths, standardRate: stdRate,
      preferentialRate: prefRate !== stdRate ? prefRate : undefined,
      annualIncome, repaymentFrequency: repaymentFreq,
      principalRounding: rounding,
    });
    data["PA_TRANO"] = repaymentRows.map((r) => ({
      "Năm": r.periodLabel ?? `Năm ${r.year}`,
      "Thu nhập trả nợ": fmtN(r.income),
      "Dư nợ": fmtN(r.balance),
      "Gốc trả": fmtN(r.principal),
      "Lãi trả": fmtN(r.interest),
      "TN còn lại": fmtN(r.remaining),
    }));

    // ── Flat aliases cho PA_TRANO fields dùng ngoài bảng loop ──
    const firstRow = repaymentRows[0];
    if (firstRow) {
      data["PA_TRANO.Thu nhập trả nợ"] = fmtN(firstRow.income);
      data["PA_TRANO.Gốc trả"] = fmtN(firstRow.principal);
      data["PA_TRANO.Dư nợ"] = fmtN(firstRow.balance);
      data["PA_TRANO.Lãi trả"] = fmtN(firstRow.interest);
      data["PA_TRANO.TN còn lại"] = fmtN(firstRow.remaining);
    }

    // ── Phí trả nợ trước hạn (HDTD placeholders) ──
    // Chỉ áp dụng cho trung/dài hạn (term > 12 tháng) với kỳ trả đều.
    // Công thức: Max phí năm N = dư nợ SAU kỳ trả đầu tiên của năm N × rate
    //           = (balance - principal) của row đầu tiên có year === N
    const MIN_FEE = 1_000_000;
    const isMidLongTerm = termMonths > 12 && repaymentRows.length > 0;

    // Vay trả trong ngày: 0.5%, max 16tr (áp dụng mọi khoản)
    const sameDayFee = Math.max(MIN_FEE, Math.min(loanAmt * 0.005, 16_000_000));
    data["HDTD.Phí vay trả trong ngày"] = "0,5%";
    data["HDTD.Min vay trả trong ngày"] = fmtN(MIN_FEE);
    data["HDTD.Max vay trả trong ngày"] = fmtN(sameDayFee);

    if (isMidLongTerm) {
      const maxFeeForYear = (year: number, rate: number): number => {
        const row = repaymentRows.find((r) => r.year === year);
        if (!row) return 0;
        const balAfter = row.balance - row.principal;
        return Math.max(MIN_FEE, balAfter * rate);
      };
      data["HDTD.Phí trả trước năm 1"] = "4%";
      data["HDTD.Min trả trước năm 1"] = fmtN(MIN_FEE);
      data["HDTD.Max trả trước năm 1"] = fmtN(maxFeeForYear(1, 0.04));
      data["HDTD.Phí trả trước năm 2"] = "3%";
      data["HDTD.Min trả trước năm 2"] = fmtN(MIN_FEE);
      data["HDTD.Max trả trước năm 2"] = fmtN(maxFeeForYear(2, 0.03));
      data["HDTD.Phí trả trước năm 3+"] = "2%";
      data["HDTD.Min trả trước năm 3+"] = fmtN(MIN_FEE);
      data["HDTD.Max trả trước năm 3+"] = fmtN(maxFeeForYear(3, 0.02));
    }
  } catch {
    data["PA_CHIPHI"] = [];
    data["PA_DOANHTHU"] = [];
    data["PA_TRANO"] = [];
  }
}
