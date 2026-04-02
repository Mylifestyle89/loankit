// Section detection and metadata extraction for Type B XLSX parser
// Scans rows for Vietnamese section markers (cost/summary/revenue)
// and extracts financial metadata from summary rows

import type { XlsxParseMeta } from "./xlsx-loan-plan-types";
import { parseNum } from "./xlsx-number-utils";

// Section marker patterns for detecting cost/summary/revenue boundaries
export const SECTION_MARKERS = {
  costTotal: /^(I\.?\s+)?t[oổ]ng\s*(chi\s*ph[ií]|c[oộ]ng)/i,
  revenue: /^(II\.?\s+)?doanh\s*thu/i,
  profit: /^(III\.?\s+)?l[oợ]i\s*nhu[aậ]n/i,
  directCost: /chi\s*ph[ií]\s*tr[uự]c\s*ti[eế]p/i,
  indirectCost: /chi\s*ph[ií]\s*gi[aá]n\s*ti[eế]p/i,
  interest: /l[aã]i\s*vay/i,
  tax: /thu[eế]/i,
  loanNeed: /nhu\s*c[aầ]u\s*v[oố]n/i,
  ownCapital: /v[oố][n]?\s*t[uự]\s*c[oó]/i,
};

// Section boundaries detected from marker rows
export type SectionBounds = {
  costEnd: number;      // last cost item row (before summary/total)
  revenueStart: number; // first revenue row (after "Doanh thu" marker)
  revenueEnd: number;   // last revenue row (before "Lợi nhuận" marker)
  summaryRows: number[]; // row indices containing summary data (lãi vay, thuế, etc.)
};

export type ColumnMapping = { name: number; unit: number; qty: number; unitPrice: number; amount: number };

/** Get text content from all cells in a row */
function getRowText(row: unknown[]): string {
  return row.map((c) => String(c ?? "").trim()).filter(Boolean).join(" ");
}

/** Detect section boundaries by scanning for marker rows */
export function splitSections(rows: unknown[][], headerRowIndex: number, cols: ColumnMapping): SectionBounds {
  const bounds: SectionBounds = {
    costEnd: rows.length - 1,
    revenueStart: -1,
    revenueEnd: -1,
    summaryRows: [],
  };

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const nameVal = String(row[cols.name] ?? "").trim();
    const rowText = getRowText(row);
    const colA = String(row[0] ?? "").trim();

    // Detect "Tổng chi phí" or "I Chi phí" → end of cost section
    if (SECTION_MARKERS.costTotal.test(nameVal) || SECTION_MARKERS.costTotal.test(colA) || SECTION_MARKERS.costTotal.test(rowText)) {
      if (bounds.costEnd === rows.length - 1) {
        bounds.costEnd = i - 1;
      }
    }

    // Detect summary rows (lãi vay, thuế, CP gián tiếp, nhu cầu vốn, vốn tự có)
    if (SECTION_MARKERS.interest.test(rowText) || SECTION_MARKERS.tax.test(nameVal) ||
        SECTION_MARKERS.indirectCost.test(rowText) || SECTION_MARKERS.loanNeed.test(rowText) ||
        SECTION_MARKERS.ownCapital.test(rowText) || SECTION_MARKERS.directCost.test(rowText)) {
      bounds.summaryRows.push(i);
    }

    // Detect "II Doanh thu" or "Doanh thu" → start of revenue section
    if (SECTION_MARKERS.revenue.test(nameVal) || SECTION_MARKERS.revenue.test(colA) ||
        (/^II\.?\s*$/i.test(colA) && SECTION_MARKERS.revenue.test(rowText))) {
      bounds.revenueStart = i;
      if (bounds.costEnd === rows.length - 1) {
        bounds.costEnd = i - 1;
      }
    }

    // Detect "III Lợi nhuận" → end of revenue section
    if (SECTION_MARKERS.profit.test(nameVal) || SECTION_MARKERS.profit.test(colA) || SECTION_MARKERS.profit.test(rowText)) {
      bounds.revenueEnd = i - 1;
    }
  }

  // If revenue started but no profit marker, revenue goes to end
  if (bounds.revenueStart >= 0 && bounds.revenueEnd < 0) {
    bounds.revenueEnd = rows.length - 1;
  }

  return bounds;
}

/** Extract metadata from summary rows (lãi vay, thuế, vốn tự có, etc.) */
export function extractSummaryMeta(rows: unknown[][], bounds: SectionBounds, cols: ColumnMapping): XlsxParseMeta {
  const meta: XlsxParseMeta = {};

  for (const rowIdx of bounds.summaryRows) {
    const row = rows[rowIdx];
    const rowText = getRowText(row);

    // Collect all numeric values from the row (excluding name column)
    const nums: number[] = [];
    for (let j = 0; j < row.length; j++) {
      if (j === cols.name) continue;
      const n = parseNum(row[j]);
      if (n !== 0) nums.push(n);
    }

    // Extract lãi vay → detect interestRate and loanAmount
    if (SECTION_MARKERS.interest.test(rowText)) {
      // Rate can be decimal (0.085) or percentage (8.5)
      let rate = nums.find((n) => n > 0 && n < 1);
      if (!rate) {
        const pctCandidate = nums.find((n) => n >= 1 && n <= 30);
        if (pctCandidate) rate = pctCandidate / 100;
      }
      // Loan amount: largest number that's not the rate and not the interest amount
      const amountCol = cols.amount >= 0 ? parseNum(row[cols.amount]) : 0;
      const loanCandidates = nums.filter((n) => n > 30 && n !== amountCol);
      const loanAmount = loanCandidates.length > 0 ? Math.max(...loanCandidates) : 0;

      if (rate) meta.interestRate = rate;
      if (loanAmount > 0) meta.loanAmount = loanAmount;
    }

    // Extract thuế
    if (SECTION_MARKERS.tax.test(rowText) && !SECTION_MARKERS.interest.test(rowText)) {
      const amountVal = cols.amount >= 0 ? parseNum(row[cols.amount]) : (nums.length > 0 ? nums[nums.length - 1] : 0);
      if (amountVal > 0) meta.tax = amountVal;
    }

    // Extract nhu cầu vốn
    if (SECTION_MARKERS.loanNeed.test(rowText)) {
      const amountVal = cols.amount >= 0 ? parseNum(row[cols.amount]) : (nums.length > 0 ? nums[nums.length - 1] : 0);
      if (amountVal > 0) meta.totalCost = amountVal;
    }

    // Extract vốn tự có
    if (SECTION_MARKERS.ownCapital.test(rowText)) {
      const amountVal = cols.amount >= 0 ? parseNum(row[cols.amount]) : (nums.length > 0 ? nums[nums.length - 1] : 0);
      if (amountVal > 0) meta.counterpartCapital = amountVal;
    }
  }

  // Extract total revenue and profit from section header rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowText = getRowText(row);
    const amountVal = cols.amount >= 0 ? parseNum(row[cols.amount]) : 0;

    if (SECTION_MARKERS.revenue.test(rowText) && /^(II|I)\.?\s/.test(String(row[0] ?? "").trim())) {
      if (amountVal > 0) meta.totalRevenue = amountVal;
    }
    if (SECTION_MARKERS.profit.test(rowText)) {
      if (amountVal > 0) meta.profit = amountVal;
    }
  }

  return meta;
}
