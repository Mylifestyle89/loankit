// Type S parser: Standard template format (TEMPLATE-*.xlsx)
// Sheet 1 "Chi phí - Doanh thu": Row 3 = Số sào, Row 5 = header, Row 6+ = cost data
// Sheet 2 "Thông tin vay": Key-value pairs (label in col A, value in col B)
// Sheet 3 "Tài sản mua sắm": Optional asset table

import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";
import type { CostItem, RevenueItem } from "@/lib/loan-plan/loan-plan-types";
import type { XlsxParseResult, XlsxParseMeta } from "./xlsx-loan-plan-types";
import { parseNum, parseDecimal } from "./xlsx-number-utils";


/** Map Vietnamese label → meta key */
const META_LABEL_MAP: Record<string, keyof XlsxParseMeta> = {
  "Số tiền vay": "loanAmount",
  "Lãi suất vay": "interestRate",
  "Thời hạn vay": "loanMonths",
  "Vòng quay vốn": "turnoverCycles",
  "Mục đích vay": "name",
  "Tổng nhu cầu vốn": "totalCost",
  "Vốn tự có (đối ứng)": "counterpartCapital",
  "Tỷ lệ vốn đối ứng": "counterpartRatio",
};

/** Parse Sheet 2 "Thông tin vay" key-value pairs */
function parseMetaSheet(wb: WorkBook): { meta: XlsxParseMeta; credit: { agribank: Record<string, string>; other: Record<string, string> } } {
  const meta: XlsxParseMeta = {};
  const credit = { agribank: {} as Record<string, string>, other: {} as Record<string, string> };

  const sheetName = wb.SheetNames.find((n) => /thông tin vay/i.test(n));
  if (!sheetName) return { meta, credit };

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });

  let section: "main" | "agribank" | "other" = "main";

  for (const row of rows) {
    const label = String(row[0] ?? "").trim();
    const value = row[1];

    // Detect section changes
    if (/DƯ NỢ TẠI AGRIBANK/i.test(label)) { section = "agribank"; continue; }
    if (/DƯ NỢ TẠI TCTD KHÁC/i.test(label)) { section = "other"; continue; }
    if (!label || /^(Trường thông tin|Giá trị|Ghi chú)$/i.test(label)) continue;

    if (section === "main") {
      const metaKey = META_LABEL_MAP[label];
      if (metaKey && value !== "" && value !== undefined) {
        if (metaKey === "name" || metaKey === "counterpartRatio") {
          meta[metaKey] = String(value);
        } else if (metaKey === "interestRate") {
          meta[metaKey] = parseDecimal(value);
        } else {
          meta[metaKey] = parseNum(value) as never;
        }
      }
    } else {
      const target = section === "agribank" ? credit.agribank : credit.other;
      if (value !== "" && value !== undefined) {
        target[label] = String(value);
      }
    }
  }

  return { meta, credit };
}

/** Skip patterns for summary/header rows */
const SKIP_PATTERNS = /^(TỔNG|CỘNG|LÃI|III|II|I\b|Chi phí gián|TỔNG CHI)/i;

/**
 * Parse Type S XLSX: Standard template with fixed structure.
 * Detects cost items from Sheet 1, revenue items after "KHOẢN MỤC DOANH THU" header,
 * and metadata from Sheet 2.
 */
export function parseTypeS(wb: WorkBook): XlsxParseResult {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  const warnings: string[] = [];

  // Read số sào from B3 (row index 2)
  const acreage = parseDecimal(rows[2]?.[1]) || 1;

  const costItems: CostItem[] = [];
  const revenueItems: RevenueItem[] = [];
  let mode: "cost" | "revenue" = "cost";

  // Detect column layout: 7-col (with SL/sào) vs 6-col (direct Qty+Price)
  // 7-col: STT | Name | Unit | UnitPrice | SL/sào | SL thực tế | Thành tiền
  // 6-col: STT | Name | Unit | Số lượng  | Đơn giá | Thành tiền
  const headerRow = rows.find((r) => /^STT$/i.test(String(r[0] ?? "").trim()));
  const colCount = headerRow ? headerRow.filter((c: unknown) => String(c ?? "").trim()).length : 7;
  const is6Col = colCount <= 6;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const colB = String(row[1] ?? "").trim();
    const colA = String(row[0] ?? "").trim();

    // Detect revenue section header
    if (/KHOẢN MỤC DOANH THU/i.test(colB)) { mode = "revenue"; continue; }
    // Skip headers and summary rows
    if (/KHOẢN MỤC CHI PHÍ/i.test(colB)) continue;
    if (/^STT$/i.test(colA)) continue;
    if (SKIP_PATTERNS.test(colB) || SKIP_PATTERNS.test(colA)) continue;
    if (/Tỷ suất lợi nhuận/i.test(colB)) continue;

    // Skip empty name rows
    if (!colB) continue;

    const unit = String(row[2] ?? "").trim() || "đơn vị";
    let unitPrice: number, actualQty: number, amount: number;

    if (is6Col) {
      // 6-col: D=Qty, E=UnitPrice, F=Amount
      actualQty = parseNum(row[3]);
      unitPrice = parseNum(row[4]);
      amount = parseNum(row[5]) || (unitPrice * actualQty);
    } else {
      // 7-col: D=UnitPrice, E=SL/sào, F=SL thực tế, G=Amount
      unitPrice = parseNum(row[3]);
      const qtyPerSao = parseNum(row[4]);
      actualQty = parseNum(row[5]) || (qtyPerSao * acreage);
      amount = parseNum(row[6]) || (unitPrice * actualQty);
    }

    // Skip rows with no meaningful data
    if (amount === 0 && actualQty === 0 && unitPrice === 0) continue;

    if (mode === "cost") {
      costItems.push({ name: colB, unit, qty: actualQty, unitPrice, amount });
    } else {
      revenueItems.push({ description: colB, unit, qty: actualQty, unitPrice, amount });
    }
  }

  // Parse metadata from Sheet 2
  const { meta, credit } = parseMetaSheet(wb);
  if (credit.agribank && Object.keys(credit.agribank).length > 0) {
    meta.creditAgribank = credit.agribank;
  }
  if (credit.other && Object.keys(credit.other).length > 0) {
    meta.creditOther = credit.other;
  }

  if (costItems.length === 0) warnings.push("Không tìm thấy khoản mục chi phí nào");

  return {
    status: warnings.length > 0 ? "partial" : "success",
    message: `Đã parse ${costItems.length} chi phí + ${revenueItems.length} doanh thu từ template chuẩn (${acreage} sào)`,
    detectedType: "S" as never,
    costItems,
    revenueItems,
    meta,
    warnings,
  };
}
