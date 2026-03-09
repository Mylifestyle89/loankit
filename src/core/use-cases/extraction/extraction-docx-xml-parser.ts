/**
 * DOCX XML table parser — extracts tables from word/document.xml via regex.
 * Returns both header-based and raw (headerless) table formats.
 */

import JSZip from "jszip";
import { decodeXmlText } from "./extraction-text-helpers";

// --- Regex patterns for OOXML table parsing ---

export const XML_PARTS_RE = /^word\/(document|header\d+|footer\d+)\.xml$/;
const W_TABLE_RE = /<w:tbl[\s\S]*?<\/w:tbl>/g;
const W_ROW_RE = /<w:tr[\s\S]*?<\/w:tr>/g;
const W_CELL_RE = /<w:tc[\s\S]*?<\/w:tc>/g;
const W_TEXT_RE = /<w:t(?=[\s>])[^>]*>([\s\S]*?)<\/w:t>/g;

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
    for (const tableMatch of xml.matchAll(W_TABLE_RE)) {
      const tableXml = tableMatch[0];
      const rowCells = [...tableXml.matchAll(W_ROW_RE)]
        .map((rowMatch) =>
          [...rowMatch[0].matchAll(W_CELL_RE)].map((cellMatch) => extractCellText(cellMatch[0])),
        )
        .filter((cells) => cells.some((cell) => cell.trim().length > 0));
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
    for (const tableMatch of xml.matchAll(W_TABLE_RE)) {
      const tableXml = tableMatch[0];
      const allRows = [...tableXml.matchAll(W_ROW_RE)]
        .map((rowMatch) =>
          [...rowMatch[0].matchAll(W_CELL_RE)].map((cellMatch) => extractCellText(cellMatch[0])),
        )
        .filter((cells) => cells.some((c) => c.trim().length > 0));
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
