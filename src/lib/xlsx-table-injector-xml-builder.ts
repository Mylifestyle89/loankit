/**
 * xlsx-table-injector-xml-builder.ts
 *
 * Low-level OOXML builders: cell, row, and full <w:tbl> element generation.
 */

import type { InjectionCell, TableInjectionSpec, CellOpts } from "./xlsx-table-injector-types";
import { PAGE_WIDTH } from "./xlsx-table-injector-types";

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

export function buildCell(
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

export function buildRow(
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

export function buildTableXml(spec: TableInjectionSpec): string {
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
