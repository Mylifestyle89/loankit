// Type B parser: vertical table format with smart section detection
// Handles generic PAKD files (thiết bị y tế, mùi nệm, etc.)
// Delegates section detection + meta extraction to xlsx-section-detector

import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";
import type { CostItem, RevenueItem } from "@/lib/loan-plan/loan-plan-types";
import type { XlsxParseResult } from "./xlsx-loan-plan-types";
import { parseNum } from "./xlsx-number-utils";
import { SECTION_MARKERS, splitSections, extractSummaryMeta, type ColumnMapping } from "./xlsx-section-detector";

// Fuzzy patterns for each column role (order-independent matching)
const COL_PATTERNS: Record<string, RegExp> = {
  stt: /^(stt|tt|#|s[oố]\s*tt)$/i,
  name: /t[eê]n\s*(h[aà]ng|s[aả]n\s*ph[aẩ]m)|n[oộ]i\s*dung|kho[aả]n\s*m[uụ]c|h[aạ]ng\s*m[uụ]c|di[eễ]n\s*gi[aả]i|s[aả]n\s*ph[aẩ]m|danh\s*m[uụ]c/i,
  unit: /[đd][oơ]n\s*v[iị]|[đd]vt/i,
  qty: /s[oố]\s*l[uư][oợ]ng|^sl$/i,
  unitPrice: /[đd][oơ]n\s*gi[aá]|^[đd]g$/i,
  amount: /th[aà]nh\s*ti[eề]n|^tt$/i,
};

// Summary/total row indicators — skip these when extracting items
const SKIP_ROW_PATTERNS = /^(t[oổ]ng|c[oộ]ng|total|sum)/i;

/** Find header row and column mapping in first 10 rows from startFrom */
function findHeaderRow(rows: unknown[][], startFrom = 0): { rowIndex: number; cols: ColumnMapping } | null {
  for (let i = startFrom; i < Math.min(rows.length, startFrom + 10); i++) {
    const row = rows[i]?.map((c) => String(c).trim()) ?? [];
    const mapping: Partial<ColumnMapping> = {};

    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (!cell) continue;
      for (const [role, pattern] of Object.entries(COL_PATTERNS)) {
        if (role === "stt") continue;
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

/** Extract items (cost or revenue) from a row range using column mapping */
function extractItems(rows: unknown[][], startRow: number, endRow: number, cols: ColumnMapping): { name: string; unit: string; qty: number; unitPrice: number; amount: number }[] {
  const items: { name: string; unit: string; qty: number; unitPrice: number; amount: number }[] = [];

  for (let i = startRow; i <= endRow && i < rows.length; i++) {
    const row = rows[i];
    const nameVal = String(row[cols.name] ?? "").trim();

    // Skip empty, summary, or section header rows
    if (!nameVal) continue;
    if (SKIP_ROW_PATTERNS.test(nameVal)) continue;
    if (/^[IVX]+\.?\s/.test(nameVal)) continue;
    if (SECTION_MARKERS.costTotal.test(nameVal) || SECTION_MARKERS.revenue.test(nameVal) ||
        SECTION_MARKERS.profit.test(nameVal) || SECTION_MARKERS.directCost.test(nameVal) ||
        SECTION_MARKERS.indirectCost.test(nameVal) || SECTION_MARKERS.interest.test(nameVal)) continue;

    const qty = cols.qty >= 0 ? parseNum(row[cols.qty]) : 0;
    const unitPrice = cols.unitPrice >= 0 ? parseNum(row[cols.unitPrice]) : 0;
    const amount = cols.amount >= 0 ? parseNum(row[cols.amount]) : qty * unitPrice;
    const unit = cols.unit >= 0 ? String(row[cols.unit] ?? "").trim() || "đơn vị" : "đơn vị";

    if (amount === 0 && qty === 0 && unitPrice === 0) continue;

    items.push({ name: nameVal, unit, qty, unitPrice, amount });
  }

  return items;
}

/**
 * Parse Type B XLSX: vertical table with smart section detection.
 * Extracts cost items, revenue items, and summary metadata.
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

  // Detect section boundaries (cost/summary/revenue)
  const bounds = splitSections(rows, rowIndex, cols);

  // Extract cost items (from header to costEnd)
  const costItems: CostItem[] = extractItems(rows, rowIndex + 1, bounds.costEnd, cols);

  // Extract revenue items if revenue section detected
  let revenueItems: RevenueItem[] = [];
  if (bounds.revenueStart >= 0) {
    // Try to find a new header row in revenue section (column names may differ)
    const revenueHeader = findHeaderRow(rows, bounds.revenueStart);
    const revCols = revenueHeader ? revenueHeader.cols : cols;
    const revStartRow = revenueHeader ? revenueHeader.rowIndex + 1 : bounds.revenueStart + 1;

    const rawRevenue = extractItems(rows, revStartRow, bounds.revenueEnd, revCols);
    revenueItems = rawRevenue.map((item) => ({
      description: item.name,
      unit: item.unit,
      qty: item.qty,
      unitPrice: item.unitPrice,
      amount: item.amount,
    }));
  }

  // Extract summary metadata (lãi vay, thuế, vốn tự có)
  const meta = extractSummaryMeta(rows, bounds, cols);

  if (costItems.length === 0) warnings.push("Không tìm thấy khoản mục chi phí nào trong bảng");
  if (bounds.revenueStart >= 0 && revenueItems.length === 0) warnings.push("Phát hiện section doanh thu nhưng không parse được khoản mục nào");

  return {
    status: warnings.length > 0 ? "partial" : "success",
    message: `Đã parse ${costItems.length} chi phí + ${revenueItems.length} doanh thu từ file Type B`,
    detectedType: "B",
    costItems,
    revenueItems,
    meta,
    warnings,
  };
}
