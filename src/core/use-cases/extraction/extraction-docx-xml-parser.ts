/**
 * DOCX XML table parser — extracts tables from word/document.xml via regex.
 * Returns both header-based and raw (headerless) table formats.
 */

import JSZip from "jszip";
import { decodeXmlText } from "./extraction-text-helpers";

// --- Regex patterns for OOXML table parsing ---

export const XML_PARTS_RE = /^word\/(document|header\d+|footer\d+)\.xml$/;
const W_ROW_RE = /<w:tr[\s\S]*?<\/w:tr>/g;
const W_CELL_RE = /<w:tc[\s\S]*?<\/w:tc>/g;
const W_TEXT_RE = /<w:t(?=[\s>])[^>]*>([\s\S]*?)<\/w:t>/g;

const TBL_OPEN = "<w:tbl";
const TBL_CLOSE = "</w:tbl>";

// Is `<w:tbl` at index i an actual table open (not <w:tblPr, <w:tblGrid, ...)?
function isRealTableOpen(xml: string, i: number): boolean {
  const ch = xml.charCodeAt(i + TBL_OPEN.length);
  // Next char must be space, tab, newline, or '>' (then <w:tbl> or <w:tbl ...>)
  return ch === 32 || ch === 9 || ch === 10 || ch === 13 || ch === 62;
}

function nextRealTableOpen(xml: string, from: number): number {
  let pos = from;
  while (pos < xml.length) {
    const idx = xml.indexOf(TBL_OPEN, pos);
    if (idx === -1) return -1;
    if (isRealTableOpen(xml, idx)) return idx;
    pos = idx + TBL_OPEN.length;
  }
  return -1;
}

/**
 * Walk XML and return all top-level <w:tbl>...</w:tbl> blocks, honoring nesting.
 * OOXML allows tables inside table cells; the previous non-greedy regex cut
 * the outer match at the first </w:tbl> it met, corrupting row extraction.
 */
export function findTopLevelTables(xml: string): string[] {
  const results: string[] = [];
  let pos = 0;
  while (pos < xml.length) {
    const start = nextRealTableOpen(xml, pos);
    if (start === -1) break;

    // Walk forward balancing nested tbl until depth returns to zero.
    let depth = 1;
    let scan = start + TBL_OPEN.length;
    while (scan < xml.length && depth > 0) {
      const nextOpen = nextRealTableOpen(xml, scan);
      const nextClose = xml.indexOf(TBL_CLOSE, scan);
      if (nextClose === -1) return results; // malformed — stop
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        scan = nextOpen + TBL_OPEN.length;
      } else {
        depth--;
        if (depth === 0) {
          const end = nextClose + TBL_CLOSE.length;
          results.push(xml.slice(start, end));
          pos = end;
        } else {
          scan = nextClose + TBL_CLOSE.length;
        }
      }
    }
    if (depth > 0) break; // malformed
  }
  return results;
}

/**
 * Remove nested <w:tbl>...</w:tbl> content from a table XML so row extraction
 * on the outer table does not pick up rows belonging to nested tables.
 */
function stripNestedTables(tableXml: string): string {
  // Keep outer wrapper (`<w:tbl...>` and closing `</w:tbl>`) and strip tables inside.
  const headerEnd = tableXml.indexOf(">");
  if (headerEnd === -1) return tableXml;
  const outerOpen = tableXml.slice(0, headerEnd + 1);
  const inner = tableXml.slice(headerEnd + 1, tableXml.length - TBL_CLOSE.length);
  const strippedInner = removeNestedTables(inner);
  return `${outerOpen}${strippedInner}${TBL_CLOSE}`;
}

function removeNestedTables(xml: string): string {
  let out = "";
  let pos = 0;
  while (pos < xml.length) {
    const start = nextRealTableOpen(xml, pos);
    if (start === -1) {
      out += xml.slice(pos);
      break;
    }
    out += xml.slice(pos, start);
    // Find matching close honoring nesting
    let depth = 1;
    let scan = start + TBL_OPEN.length;
    while (scan < xml.length && depth > 0) {
      const nextOpen = nextRealTableOpen(xml, scan);
      const nextClose = xml.indexOf(TBL_CLOSE, scan);
      if (nextClose === -1) return out; // malformed
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        scan = nextOpen + TBL_OPEN.length;
      } else {
        depth--;
        scan = nextClose + TBL_CLOSE.length;
      }
    }
    pos = scan;
  }
  return out;
}

function extractTableCells(tableXml: string): string[][] {
  const safeXml = stripNestedTables(tableXml);
  return [...safeXml.matchAll(W_ROW_RE)]
    .map((rowMatch) =>
      [...rowMatch[0].matchAll(W_CELL_RE)].map((cellMatch) => extractCellText(cellMatch[0])),
    )
    .filter((cells) => cells.some((cell) => cell.trim().length > 0));
}

// --- Types ---

export type ParsedTable = { headers: string[]; rows: string[][] };
export type RawParsedTable = { columnCount: number; rows: string[][] };

// --- Cell text extraction ---

function extractCellText(cellXml: string): string {
  const parts: string[] = [];
  for (const match of cellXml.matchAll(W_TEXT_RE)) {
    if (match[1]) parts.push(match[1]);
  }
  return decodeXmlText(parts.join("")).trim();
}

// --- Load XML parts from DOCX buffer ---

async function loadXmlParts(buffer: Buffer): Promise<{ zip: JSZip; xmlPaths: string[] } | null> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return null;
  }
  const xmlPaths = Object.keys(zip.files)
    .filter((name) => XML_PARTS_RE.test(name))
    .sort();
  return { zip, xmlPaths };
}

// --- Parse tables with first-row-as-header ---

export async function parseXmlTablesFromDocx(buffer: Buffer): Promise<ParsedTable[]> {
  const loaded = await loadXmlParts(buffer);
  if (!loaded) return [];
  const { zip, xmlPaths } = loaded;
  const parsedTables: ParsedTable[] = [];

  for (const xmlPath of xmlPaths) {
    const xml = await zip.file(xmlPath)?.async("string");
    if (!xml) continue;
    for (const tableXml of findTopLevelTables(xml)) {
      const rowCells = extractTableCells(tableXml);
      if (rowCells.length < 2) continue;
      const headers = rowCells[0].map((h) => h.trim()).filter(Boolean);
      if (headers.length < 2) continue;
      const rows = rowCells
        .slice(1)
        .map((cells) => cells.map((c) => c.trim()))
        .filter((cells) => cells.length === headers.length && cells.some(Boolean));
      if (rows.length === 0) continue;
      parsedTables.push({ headers, rows });
    }
  }
  return parsedTables;
}

// --- Parse tables raw (all rows, no header assumption) ---

export async function parseXmlTablesRaw(buffer: Buffer): Promise<RawParsedTable[]> {
  const loaded = await loadXmlParts(buffer);
  if (!loaded) return [];
  const { zip, xmlPaths } = loaded;
  const tables: RawParsedTable[] = [];

  for (const xmlPath of xmlPaths) {
    const xml = await zip.file(xmlPath)?.async("string");
    if (!xml) continue;
    for (const tableXml of findTopLevelTables(xml)) {
      const allRows = extractTableCells(tableXml);
      if (allRows.length === 0) continue;
      const columnCount = allRows[0].length;
      if (columnCount < 2) continue;
      const normalizedRows = allRows
        .map((cells) => cells.map((c) => c.trim()))
        .filter((cells) => cells.length === columnCount);
      if (normalizedRows.length === 0) continue;
      tables.push({ columnCount, rows: normalizedRows });
    }
  }
  return tables;
}

// --- Parse pipe-delimited tables from plain text ---

export function parsePipeTableRows(text: string): ParsedTable[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const tables: ParsedTable[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.includes("|")) { i += 1; continue; }
    const headerCells = line.split("|").map((x) => x.trim()).filter(Boolean);
    if (headerCells.length < 2) { i += 1; continue; }
    const rowItems: string[][] = [];
    let j = i + 1;
    while (j < lines.length && lines[j].includes("|")) {
      const cells = lines[j].split("|").map((x) => x.trim()).filter(Boolean);
      if (cells.length === headerCells.length) rowItems.push(cells);
      j += 1;
    }
    if (rowItems.length > 0) {
      tables.push({ headers: headerCells, rows: rowItems });
      i = j;
      continue;
    }
    i += 1;
  }
  return tables;
}
