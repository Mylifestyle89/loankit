/**
 * xlsx-table-injector-types.ts
 *
 * Shared types and constants for the xlsx-table-injector module.
 */

// ─── Public Types ─────────────────────────────────────────────────────────────

export type InjectionCell = string | number | null;

export type InjectionRow = {
  cells: InjectionCell[];
  /** Bold all cells in this row (e.g. subtotal / total rows). */
  bold?: boolean;
};

export type TableInjectionSpec = {
  /**
   * Placeholder text WITHOUT brackets.
   * e.g. "Bảng cân đối kế toán" for a template containing [Bảng cân đối kế toán]
   */
  placeholder: string;
  headers: string[];
  rows: InjectionRow[];
  options?: {
    /** Hex fill for header row, default "4472C4" (Word blue). */
    headerFill?: string;
    /** Header text colour hex, default "FFFFFF". */
    headerColor?: string;
    /** Font size in half-points (18 = 9 pt, 20 = 10 pt). Default 18. */
    fontSize?: number;
    /** Column widths in twips. Auto-distributed when empty or wrong length. */
    colWidths?: number[];
    /** Bold the first (label) column of data rows. Default false. */
    firstColBold?: boolean;
    /** Column indices to right-align (numeric data). Default: auto by value type. */
    numericCols?: number[];
  };
};

// ─── Internal ─────────────────────────────────────────────────────────────────

export type CellOpts = {
  fontSize: number;
  headerFill: string;
  headerColor: string;
  firstColBold: boolean;
  numericCols: number[];
};

/** Approximate usable content width for A4 with 2.54 cm side margins (twips). */
export const PAGE_WIDTH = 9360;

/** Mã số codes that represent totals/sub-totals → rendered bold. */
export const BOLD_CODES = new Set([
  // CDKT
  "100", "200", "250", "270", "300", "310", "320", "400", "440",
  // KQKD
  "10", "20", "30", "50", "60",
]);
