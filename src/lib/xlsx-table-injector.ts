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
import { buildTableXml } from "./xlsx-table-injector-xml-builder";
import { findParagraphs, paragraphText } from "./xlsx-table-injector-paragraph-ops";
import { BOLD_CODES } from "./xlsx-table-injector-types";
import type { TableInjectionSpec } from "./xlsx-table-injector-types";

// Re-export all public types and constants for backward compatibility
export type { InjectionCell, InjectionRow, TableInjectionSpec } from "./xlsx-table-injector-types";
export { BOLD_CODES } from "./xlsx-table-injector-types";

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
