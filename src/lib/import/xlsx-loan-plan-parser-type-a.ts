// Type A parser: horizontal key-value format
// Sheet1 Row1 = headers with _DG/_SL/_TT suffixes, Row2 = values
// Sheet2 (optional) has [PA.xxx] placeholder mapping for meta fields

import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";
import type { CostItem, RevenueItem } from "@/lib/loan-plan/loan-plan-types";
import type { XlsxParseResult, XlsxParseMeta } from "./xlsx-loan-plan-types";
import { parseNum } from "./xlsx-number-utils";

// Known cost item names -> default units
const KNOWN_UNITS: Record<string, string> = {
  "Xử lý đất": "m2", "Cây giống": "cây", "Phân hữu cơ": "m3",
  "Đạm": "kg", "Lân": "kg", "KaLi": "kg", "NPK": "kg",
  "Phân vi sinh": "kg", "Vôi": "kg", "Thuốc BVTV": "lít",
  "Chi phí tưới": "giờ", "Công lao động": "công",
  "Con giống": "con", "Thức ăn": "kg", "Bò thịt": "con",
  "Nhà kính": "bộ",
};

// Meta field key mapping (Vietnamese header -> meta property)
const META_KEY_MAP: Record<string, keyof XlsxParseMeta> = {
  "Số tiền vay": "loanAmount",
  "Vốn đối ứng": "counterpartCapital",
  "Tỷ lệ vốn đối ứng": "counterpartRatio",
  "Mục đích vay": "name",
  "Thời hạn vay": "loanMonths",
  "Lãi suất vay": "interestRate",
  "Tổng doanh thu dự kiến": "totalRevenue",
  "Tổng chi phí dự kiến": "totalCost",
  "Lợi nhuận dự kiến": "profit",
  "Sản lượng": "yield",
  "Thu nhập": "unitPrice",
  "Tổng nhu cầu vốn": "totalCapitalNeed",
  "Số vòng quay": "turnoverCycles",
  "Số sào đất": "landArea",
  "Số năm khấu hao": "depreciationYears",
  "Đơn giá nhà kính": "assetUnitPrice",
  "Số sào đất NN": "landAreaSau",
  "Số HĐ thi công": "constructionContractNo",
  "Ngày HĐ thi công": "constructionContractDate",
  "Lãi suất ưu đãi": "preferentialRate",
  "Địa chỉ đất NN": "farmAddress",
};


/** Parse percentage value (could be 0.085, 8.5%, "8,5%/năm") */
function parseRate(val: unknown): number {
  let s = String(val).replace(/\/năm/i, "").trim();
  s = s.replace(",", "."); // Vietnamese comma decimal -> dot
  if (s.includes("%")) {
    const n = Number(s.replace("%", ""));
    return isNaN(n) ? 0 : n / 100;
  }
  const n = Number(s);
  if (isNaN(n)) return 0;
  return n > 1 ? n / 100 : n;
}

/**
 * Parse Type A XLSX: horizontal key-value with _DG/_SL/_TT suffixes
 */
export function parseTypeA(wb: WorkBook): XlsxParseResult {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  const warnings: string[] = [];

  if (rows.length < 2) {
    return { status: "error", message: "Sheet1 cần ít nhất 2 dòng (header + data)", detectedType: "A", costItems: [], revenueItems: [], meta: {}, warnings };
  }

  const headers = rows[0].map((h) => String(h).trim());
  const values = rows[1];

  // Build key-value map
  const kvMap: Record<string, unknown> = {};
  headers.forEach((h, i) => { if (h) kvMap[h] = values[i]; });

  // Group cost items by base name (strip _DG/_SL/_TT suffix)
  const costGroups = new Map<string, { dg: number; sl: number; tt: number }>();
  const metaFields: Record<string, unknown> = {};

  for (const header of headers) {
    if (!header) continue;
    if (header.endsWith("_DG") || header.endsWith("_SL") || header.endsWith("_TT")) {
      const baseName = header.slice(0, -3);
      if (!costGroups.has(baseName)) costGroups.set(baseName, { dg: 0, sl: 0, tt: 0 });
      const group = costGroups.get(baseName)!;
      const val = kvMap[header];
      if (header.endsWith("_DG")) group.dg = parseNum(val);
      else if (header.endsWith("_SL")) group.sl = parseNum(val);
      else group.tt = parseNum(val);
    } else {
      metaFields[header] = kvMap[header];
    }
  }

  // Convert cost groups to CostItem[]
  const costItems: CostItem[] = [];
  for (const [name, g] of costGroups) {
    // Skip zero-amount items
    const amount = g.tt || g.dg * g.sl;
    if (amount === 0 && g.sl === 0) continue;
    costItems.push({
      name,
      unit: KNOWN_UNITS[name] ?? "đơn vị",
      qty: g.sl,
      unitPrice: g.dg,
      amount,
    });
  }

  // Extract meta from non-suffix fields
  const meta: XlsxParseMeta = {};
  for (const [key, val] of Object.entries(metaFields)) {
    const metaKey = META_KEY_MAP[key];
    if (!metaKey) continue;
    if (metaKey === "interestRate" || metaKey === "preferentialRate") {
      (meta as Record<string, unknown>)[metaKey] = parseRate(val);
    } else if (["name", "counterpartRatio", "constructionContractNo", "constructionContractDate", "farmAddress"].includes(metaKey as string)) {
      // Convert Excel serial date to DD/MM/YYYY for date fields
      if (metaKey === "constructionContractDate" && typeof val === "number" && val > 30000) {
        const d = new Date((val - 25569) * 86400000);
        (meta as Record<string, unknown>)[metaKey] = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
      } else {
        (meta as Record<string, unknown>)[metaKey] = String(val);
      }
    } else {
      (meta as Record<string, unknown>)[metaKey] = parseNum(val);
    }
  }

  // Build revenue items from yield + unitPrice if available
  const revenueItems: RevenueItem[] = [];
  if (meta.yield && meta.unitPrice) {
    revenueItems.push({
      description: "Doanh thu dự kiến",
      qty: meta.yield as number,
      unitPrice: meta.unitPrice as number,
      amount: (meta.yield as number) * (meta.unitPrice as number),
    });
  }

  if (costItems.length === 0) warnings.push("Không tìm thấy khoản mục chi phí nào");

  return {
    status: warnings.length > 0 ? "partial" : "success",
    message: `Đã parse ${costItems.length} khoản mục chi phí từ file Type A`,
    detectedType: "A",
    costItems,
    revenueItems,
    meta,
    warnings,
  };
}
