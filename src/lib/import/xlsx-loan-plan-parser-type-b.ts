// Type B parser: vertical table format
// Rows have columns: STT | Tên hàng | ĐVT | Số lượng | Đơn giá | Thành tiền
// Header names vary in casing/wording — use fuzzy matching

import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";
import type { CostItem } from "@/lib/loan-plan/loan-plan-types";
import type { XlsxParseResult } from "./xlsx-loan-plan-types";

// Fuzzy patterns for each column role
const COL_PATTERNS: Record<string, RegExp> = {
  stt: /^(stt|tt|#|s[oố]\s*tt)$/i,
  name: /t[eê]n\s*h[aà]ng|n[oộ]i\s*dung|kho[aả]n\s*m[uụ]c|h[aạ]ng\s*m[uụ]c|di[eễ]n\s*gi[aả]i/i,
  unit: /[đd][oơ]n\s*v[iị]|[đd]vt/i,
  qty: /s[oố]\s*l[uư][oợ]ng|^sl$/i,
  unitPrice: /[đd][oơ]n\s*gi[aá]|^[đd]g$/i,
  amount: /th[aà]nh\s*ti[eề]n|^tt$/i,
};

// Summary/total row indicators — skip these rows
const SKIP_ROW_PATTERNS = /^(t[oổ]ng|c[oộ]ng|total|sum)/i;

type ColumnMapping = { name: number; unit: number; qty: number; unitPrice: number; amount: number };

/** Find header row and column mapping in first 10 rows */
function findHeaderRow(rows: unknown[][]): { rowIndex: number; cols: ColumnMapping } | null {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i].map((c) => String(c).trim());
    const mapping: Partial<ColumnMapping> = {};

    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (!cell) continue;
      for (const [role, pattern] of Object.entries(COL_PATTERNS)) {
        if (role === "stt") continue; // skip STT, not needed in output
        if (pattern.test(cell) && !(role in mapping)) {
          mapping[role as keyof ColumnMapping] = j;
        }
      }
    }

    // Need at least name + amount (or name + qty + unitPrice)
    if (mapping.name !== undefined && (mapping.amount !== undefined || (mapping.qty !== undefined && mapping.unitPrice !== undefined))) {
      return {
        rowIndex: i,
        cols: {
          name: mapping.name,
          unit: mapping.unit ?? -1,
          qty: mapping.qty ?? -1,
          unitPrice: mapping.unitPrice ?? -1,
          amount: mapping.amount ?? -1,
        },
      };
    }
  }
  return null;
}

/** Parse number, handling VND formatting (thousand-sep dots) while preserving real decimals */
function parseNum(val: unknown): number {
  if (typeof val === "number") return val;
  let s = String(val).replace(/[\sđ]/g, "");
  s = s.replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Parse Type B XLSX: vertical table with fuzzy header matching
 */
export function parseTypeB(wb: WorkBook): XlsxParseResult {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  const warnings: string[] = [];

  const headerResult = findHeaderRow(rows);
  if (!headerResult) {
    return { status: "error", message: "Không tìm thấy dòng tiêu đề bảng chi phí", detectedType: "B", costItems: [], revenueItems: [], meta: {}, warnings };
  }

  const { rowIndex, cols } = headerResult;
  const costItems: CostItem[] = [];

  // Parse data rows after header
  for (let i = rowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const nameVal = String(row[cols.name] ?? "").trim();

    // Skip empty or summary rows
    if (!nameVal) continue;
    if (SKIP_ROW_PATTERNS.test(nameVal)) continue;
    // Skip Roman numeral section headers (I, II, III, IV)
    if (/^[IVX]+\.?\s/.test(nameVal)) continue;

    const qty = cols.qty >= 0 ? parseNum(row[cols.qty]) : 0;
    const unitPrice = cols.unitPrice >= 0 ? parseNum(row[cols.unitPrice]) : 0;
    const amount = cols.amount >= 0 ? parseNum(row[cols.amount]) : qty * unitPrice;
    const unit = cols.unit >= 0 ? String(row[cols.unit] ?? "").trim() || "đơn vị" : "đơn vị";

    // Skip rows with no meaningful data
    if (amount === 0 && qty === 0 && unitPrice === 0) continue;

    costItems.push({ name: nameVal, unit, qty, unitPrice, amount });
  }

  if (costItems.length === 0) warnings.push("Không tìm thấy khoản mục chi phí nào trong bảng");

  return {
    status: warnings.length > 0 ? "partial" : "success",
    message: `Đã parse ${costItems.length} khoản mục chi phí từ file Type B`,
    detectedType: "B",
    costItems,
    revenueItems: [],
    meta: {},
    warnings,
  };
}
