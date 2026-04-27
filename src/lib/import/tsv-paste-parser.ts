/**
 * Parse TSV (Tab-Separated Values) from Excel/Sheets clipboard paste.
 *
 * parseTsvToAgricultureItems: STT | Khoản mục | ĐVT | Đơn giá | Số lượng | Thành tiền
 * parseTsvToCostItems:        Hạng mục | ĐVT | Số lượng | Đơn giá | Thành tiền
 * parseTsvToRevenueItems:     Hạng mục | ĐVT | Số lượng | Đơn giá | Thành tiền
 */

import type { AgricultureItem, CostItem, RevenueItem } from "@/lib/loan-plan/loan-plan-types";
import { parseNum } from "./xlsx-number-utils";

const HEADER_KEYWORDS = ["stt", "khoản mục", "nhóm hàng", "đvt", "đơn giá", "số lượng", "thành tiền", "doanh thu"];

function isHeaderRow(cols: string[]): boolean {
  const name = (cols[1] ?? cols[0] ?? "").trim().toLowerCase();
  return HEADER_KEYWORDS.some((k) => name.includes(k));
}

export function parseTsvToAgricultureItems(tsv: string): AgricultureItem[] {
  const lines = tsv.split(/\r?\n/).filter((l) => l.trim());
  const items: AgricultureItem[] = [];

  for (const line of lines) {
    const cols = line.split("\t");
    if (isHeaderRow(cols)) continue;

    const order = cols[0]?.trim() || undefined;
    const name = cols[1]?.trim() ?? "";
    if (!name) continue;

    const unit = cols[2]?.trim() || undefined;
    const unitPrice = parseNum(cols[3]);
    const quantity = parseNum(cols[4]);
    const amount = parseNum(cols[5]) || (unitPrice > 0 && quantity > 0 ? unitPrice * quantity : 0);

    // Treat as group header if no numeric data in any value column
    const isGroupHeader = !unit && unitPrice === 0 && quantity === 0 && amount === 0;

    items.push({ order, name, unit, unitPrice: unitPrice || undefined, quantity: quantity || undefined, amount, isGroupHeader });
  }

  return items;
}

/**
 * Chi phí trực tiếp: Hạng mục | ĐVT | Số lượng | Đơn giá | Thành tiền
 */
export function parseTsvToCostItems(tsv: string): CostItem[] {
  const lines = tsv.split(/\r?\n/).filter((l) => l.trim());
  const items: CostItem[] = [];

  for (const line of lines) {
    const cols = line.split("\t");
    if (isHeaderRow(cols)) continue;

    const name = cols[0]?.trim() ?? "";
    if (!name) continue;

    const unit = cols[1]?.trim() ?? "";
    const qty = parseNum(cols[2]);
    const unitPrice = parseNum(cols[3]);
    const amount = parseNum(cols[4]) || (qty > 0 && unitPrice > 0 ? qty * unitPrice : 0);

    items.push({ name, unit, qty, unitPrice, amount });
  }

  return items;
}

/**
 * Doanh thu dự kiến: Hạng mục | ĐVT | Số lượng | Đơn giá | Thành tiền
 */
export function parseTsvToRevenueItems(tsv: string): RevenueItem[] {
  const lines = tsv.split(/\r?\n/).filter((l) => l.trim());
  const items: RevenueItem[] = [];

  for (const line of lines) {
    const cols = line.split("\t");
    if (isHeaderRow(cols)) continue;

    const description = cols[0]?.trim() ?? "";
    if (!description) continue;

    const unit = cols[1]?.trim() || "đ";
    const qty = parseNum(cols[2]);
    const unitPrice = parseNum(cols[3]);
    const amount = parseNum(cols[4]) || (qty > 0 && unitPrice > 0 ? qty * unitPrice : 0);

    items.push({ description, unit, qty, unitPrice, amount });
  }

  return items;
}
