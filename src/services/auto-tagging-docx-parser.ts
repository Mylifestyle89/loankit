import JSZip from "jszip";

import { ValidationError } from "@/core/errors/app-error";

import type { DocxParagraph } from "./auto-tagging-types";

// ---------------------------------------------------------------------------
// DOCX text extraction (JSZip + XML regex)
// Extracts both free paragraphs and table rows (pipe-delimited) in document order.
// Table rows are critical for collateral (TSBĐ) and loan data in bank documents.
// ---------------------------------------------------------------------------

const XML_PARTS_RE = /^word\/(document|header\d+|footer\d+)\.xml$/;
const W_PARAGRAPH_RE = /<w:p[ >][\s\S]*?<\/w:p>/g;
const W_TEXT_RE = /<w:t(?=[\s>])[^>]*>([\s\S]*?)<\/w:t>/g;
const W_TABLE_RE = /<w:tbl[ >][\s\S]*?<\/w:tbl>/g;
const W_TABLE_ROW_RE = /<w:tr[ >][\s\S]*?<\/w:tr>/g;
const W_TABLE_CELL_RE = /<w:tc[ >][\s\S]*?<\/w:tc>/g;

async function loadDocxZip(docxBuffer: Buffer): Promise<JSZip> {
  try {
    return await JSZip.loadAsync(docxBuffer);
  } catch {
    throw new ValidationError("File không phải DOCX hợp lệ.");
  }
}

function extractTextFromParagraphXml(xml: string): string {
  const parts: string[] = [];
  for (const m of xml.matchAll(W_TEXT_RE)) {
    if (m[1]) parts.push(m[1]);
  }
  return parts.join("").trim();
}

type RawEntry = { index: number; text: string };

/**
 * Extract all content from one XML part in document order:
 * - Table rows → "cell1 | cell2 | cell3" (preserves structure for AI)
 * - Free paragraphs (not inside tables) → plain text
 */
function extractEntriesFromXml(xml: string): RawEntry[] {
  const entries: RawEntry[] = [];

  // Collect table absolute ranges to exclude inner <w:p> from paragraph pass
  const tableRanges: { start: number; end: number }[] = [];
  for (const tableMatch of xml.matchAll(W_TABLE_RE)) {
    const start = tableMatch.index!;
    tableRanges.push({ start, end: start + tableMatch[0].length });

    // Extract each table row as pipe-delimited text
    for (const rowMatch of tableMatch[0].matchAll(W_TABLE_ROW_RE)) {
      const cells: string[] = [];
      for (const cellMatch of rowMatch[0].matchAll(W_TABLE_CELL_RE)) {
        cells.push(extractTextFromParagraphXml(cellMatch[0]));
      }
      const rowText = cells.join(" | ").trim();
      // Only include rows that have at least one non-empty cell
      if (rowText.replace(/\|/g, "").trim()) {
        entries.push({ index: start + rowMatch.index!, text: rowText });
      }
    }
  }

  // Extract free paragraphs (skip those inside table ranges)
  for (const match of xml.matchAll(W_PARAGRAPH_RE)) {
    const idx = match.index!;
    const insideTable = tableRanges.some((r) => idx >= r.start && idx < r.end);
    if (insideTable) continue;
    const text = extractTextFromParagraphXml(match[0]);
    if (text) entries.push({ index: idx, text });
  }

  return entries.sort((a, b) => a.index - b.index);
}

export async function extractParagraphs(docxBuffer: Buffer): Promise<DocxParagraph[]> {
  const zip = await loadDocxZip(docxBuffer);
  const xmlParts = Object.keys(zip.files).filter((name) => XML_PARTS_RE.test(name));
  const result: DocxParagraph[] = [];
  let globalIndex = 0;

  for (const xmlPath of xmlParts.sort()) {
    const xml = await zip.file(xmlPath)?.async("string");
    if (!xml) continue;
    for (const entry of extractEntriesFromXml(xml)) {
      result.push({ index: globalIndex, text: entry.text, xmlPath });
      globalIndex++;
    }
  }
  return result;
}

export { loadDocxZip, XML_PARTS_RE, W_PARAGRAPH_RE };
