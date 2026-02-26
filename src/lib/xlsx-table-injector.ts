/**
 * xlsx-table-injector.ts
 *
 * Replaces placeholder paragraphs in a DOCX buffer with OOXML <w:tbl> elements.
 *
 * Word documents store text in <w:t> elements inside <w:r> runs inside <w:p>
 * paragraphs. A placeholder like [Bảng cân đối kế toán] may be split across
 * multiple runs by Word's XML formatter. This injector:
 *   1. Scans all <w:p> elements in word/document.xml
 *   2. Concatenates <w:t> content to reconstruct the visible text
 *   3. Replaces the matching paragraph with a generated <w:tbl> element
 *
 * IMPORTANT: Call this BEFORE docxtemplater to avoid DataPlaceholderMismatchError.
 *
 * Typical flow:
 *   const modifiedBuffer = injectTables(templateBuffer, specs);
 *   // then feed modifiedBuffer into docxtemplater for text-field substitution
 */

import PizZip from "pizzip";

import type { FinancialRow, SubTable } from "./bctc-extractor";

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

type CellOpts = {
  fontSize: number;
  headerFill: string;
  headerColor: string;
  firstColBold: boolean;
  numericCols: number[];
};

/** Approximate usable content width for A4 with 2.54 cm side margins (twips). */
const PAGE_WIDTH = 9360;

/** Mã số codes that represent totals/sub-totals → rendered bold. */
const BOLD_CODES = new Set([
  // CDKT
  "100", "200", "270", "300", "310", "320", "400", "440",
  // KQKD
  "10", "20", "30", "50", "60",
]);

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Format a number in Vietnamese financial style:
 * dot as thousands separator, parentheses for negatives, no decimal places.
 */
function fmtNum(v: number): string {
  const abs = Math.abs(v);
  const s = Math.round(abs).toLocaleString("en-US").replace(/,/g, ".");
  return v < 0 ? `(${s})` : s;
}

function cellToStr(v: InjectionCell): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? fmtNum(v) : "";
  return String(v);
}

function buildCell(
  value: InjectionCell,
  width: number,
  colIdx: number,
  isHeader: boolean,
  rowBold: boolean,
  opts: CellOpts,
): string {
  const text = cellToStr(value);
  const isNumeric = !isHeader && (typeof value === "number" || opts.numericCols.includes(colIdx));
  const isBold = isHeader || rowBold || (opts.firstColBold && colIdx === 0);
  const jcVal = isHeader ? "center" : isNumeric ? "right" : "left";

  let tcInner = `<w:tcW w:w="${width}" w:type="dxa"/>`;
  if (isHeader && opts.headerFill) {
    tcInner += `<w:shd w:val="clear" w:color="auto" w:fill="${opts.headerFill}"/>`;
  }

  const boldXml = isBold ? "<w:b/><w:bCs/>" : "";
  const colorXml = isHeader && opts.headerColor ? `<w:color w:val="${opts.headerColor}"/>` : "";
  const sz = opts.fontSize;

  return (
    `<w:tc>` +
    `<w:tcPr>${tcInner}</w:tcPr>` +
    `<w:p>` +
    `<w:pPr><w:spacing w:before="40" w:after="40"/><w:jc w:val="${jcVal}"/></w:pPr>` +
    `<w:r>` +
    `<w:rPr>${boldXml}${colorXml}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>` +
    `<w:t xml:space="preserve">${escXml(text)}</w:t>` +
    `</w:r>` +
    `</w:p>` +
    `</w:tc>`
  );
}

function buildRow(
  cells: InjectionCell[],
  colWidths: number[],
  isHeader: boolean,
  rowBold: boolean,
  opts: CellOpts,
): string {
  const trPr = isHeader
    ? `<w:trPr><w:tblHeader/></w:trPr>`
    : `<w:trPr><w:trHeight w:val="280" w:hRule="atLeast"/></w:trPr>`;
  const tcs = cells
    .map((cell, i) => buildCell(cell, colWidths[i] ?? 1000, i, isHeader, rowBold, opts))
    .join("");
  return `<w:tr>${trPr}${tcs}</w:tr>`;
}

function buildTableXml(spec: TableInjectionSpec): string {
  const cols = spec.headers.length;

  const opts: CellOpts = {
    fontSize: spec.options?.fontSize ?? 18,
    headerFill: spec.options?.headerFill ?? "4472C4",
    headerColor: spec.options?.headerColor ?? "FFFFFF",
    firstColBold: spec.options?.firstColBold ?? false,
    numericCols: spec.options?.numericCols ?? [],
  };

  // Resolve column widths
  const provided = spec.options?.colWidths;
  let colWidths: number[];
  if (provided && provided.length === cols) {
    colWidths = provided;
  } else if (cols >= 3) {
    // Give the first (label) column 50 % of total width
    const labelW = Math.floor(PAGE_WIDTH * 0.5);
    const otherW = Math.floor((PAGE_WIDTH - labelW) / (cols - 1));
    colWidths = [labelW, ...Array(cols - 1).fill(otherW)];
  } else {
    colWidths = Array(cols).fill(Math.floor(PAGE_WIDTH / cols));
  }

  const borders = ["top", "left", "bottom", "right", "insideH", "insideV"]
    .map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`)
    .join("");

  const tblGrid = colWidths.map((w) => `<w:gridCol w:w="${w}"/>`).join("");
  const headerRow = buildRow(spec.headers, colWidths, true, false, opts);
  const dataRows = spec.rows
    .map((r) => buildRow(r.cells, colWidths, false, r.bold ?? false, opts))
    .join("");

  return (
    `<w:tbl>` +
    `<w:tblPr>` +
    `<w:tblW w:w="0" w:type="auto"/>` +
    `<w:tblBorders>${borders}</w:tblBorders>` +
    `</w:tblPr>` +
    `<w:tblGrid>${tblGrid}</w:tblGrid>` +
    headerRow +
    dataRows +
    `</w:tbl>`
  );
}

/**
 * Find all <w:p> element boundaries in document XML.
 * Uses a positive lookahead so <w:pPr>, <w:pStyle> etc. are NOT matched.
 */
function findParagraphs(xml: string): Array<{ start: number; end: number }> {
  const result: Array<{ start: number; end: number }> = [];
  const re = /<w:p(?=[>\s/])/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(xml)) !== null) {
    const start = m.index;
    const gt = xml.indexOf(">", start);
    if (gt === -1) continue;

    // Self-closing: <w:p ... />
    if (xml[gt - 1] === "/") {
      result.push({ start, end: gt + 1 });
      continue;
    }

    const closeIdx = xml.indexOf("</w:p>", gt);
    if (closeIdx === -1) continue;

    result.push({ start, end: closeIdx + 6 });
    re.lastIndex = closeIdx + 6; // advance past this paragraph
  }

  return result;
}

/**
 * Concatenate the text of all <w:t> elements in a paragraph XML snippet.
 * Tolerant of run-split placeholders where Word breaks a tag across runs.
 */
function paragraphText(pXml: string): string {
  const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
  let text = "";
  let m: RegExpExecArray | null;
  while ((m = re.exec(pXml)) !== null) text += m[1];
  return text;
}

// ─── Main API ─────────────────────────────────────────────────────────────────

/**
 * Inject OOXML tables into a DOCX buffer by replacing placeholder paragraphs.
 *
 * Unknown placeholders are silently skipped (no throw).
 * Returns a new buffer; the input buffer is not mutated.
 */
export function injectTables(docxBuffer: Buffer, specs: TableInjectionSpec[]): Buffer {
  if (!specs.length) return docxBuffer;

  const zip = new PizZip(docxBuffer);
  let xml = zip.file("word/document.xml")?.asText();
  if (!xml) return docxBuffer;

  for (const spec of specs) {
    const target = `[${spec.placeholder}]`;
    const tableXml = buildTableXml(spec);

    // Primary: scan paragraphs, reconstruct text, replace matching one
    const paragraphs = findParagraphs(xml);
    let replaced = false;

    for (const { start, end } of paragraphs) {
      if (paragraphText(xml.slice(start, end)).includes(target)) {
        xml = xml.slice(0, start) + tableXml + xml.slice(end);
        replaced = true;
        break;
      }
    }

    // Fallback: raw string search when placeholder is not split across runs
    if (!replaced) {
      const idx = xml.indexOf(target);
      if (idx !== -1) {
        const pStart = xml.lastIndexOf("<w:p", idx);
        const pEnd = xml.indexOf("</w:p>", idx);
        if (pStart !== -1 && pEnd !== -1) {
          xml = xml.slice(0, pStart) + tableXml + xml.slice(pEnd + 6);
        }
      }
    }
  }

  zip.file("word/document.xml", xml);
  return Buffer.from(zip.generate({ type: "nodebuffer", compression: "DEFLATE" }));
}

// ─── Spec Builders ────────────────────────────────────────────────────────────

/**
 * Build a TableInjectionSpec from CDKT or KQKD FinancialRow[] data.
 *
 * @param placeholder  - Without brackets, e.g. "Bảng cân đối kế toán"
 * @param colLabels    - [chiTieu, maSo, currentLabel, priorLabel]
 * @param rows         - BctcExtractResult.cdkt.rows or .kqkd.rows
 */
export function financialRowsToSpec(
  placeholder: string,
  colLabels: [string, string, string, string],
  rows: FinancialRow[],
  options?: TableInjectionSpec["options"],
): TableInjectionSpec {
  return {
    placeholder,
    headers: colLabels,
    rows: rows.map((r) => ({
      cells: [r.chiTieu, r.maSo, r.current, r.prior],
      bold: BOLD_CODES.has(r.maSo),
    })),
    options: {
      colWidths: [5500, 700, 1530, 1530],
      numericCols: [2, 3],
      headerFill: "4472C4",
      headerColor: "FFFFFF",
      fontSize: 18,
      ...options,
    },
  };
}

/**
 * Build a TableInjectionSpec from a generic SubTable
 * (CT PHAI THU, TON KHO, CT PHAI TRA).
 * Numeric columns are auto-detected: column is numeric if >50 % of cells
 * are JS numbers.
 */
export function subTableToSpec(
  placeholder: string,
  subTable: SubTable,
  options?: TableInjectionSpec["options"],
): TableInjectionSpec {
  const numericCols: number[] = [];
  if (subTable.rows.length > 0) {
    for (let col = 0; col < subTable.headers.length; col++) {
      const key = subTable.headers[col];
      const numCount = subTable.rows.filter((r) => typeof r[key] === "number").length;
      if (numCount / subTable.rows.length > 0.5) numericCols.push(col);
    }
  }

  return {
    placeholder,
    headers: subTable.headers,
    rows: subTable.rows.map((r) => ({
      cells: subTable.headers.map((h) => r[h] ?? null),
    })),
    options: {
      numericCols,
      headerFill: "4472C4",
      headerColor: "FFFFFF",
      fontSize: 18,
      ...options,
    },
  };
}
