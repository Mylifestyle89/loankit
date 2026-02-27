import path from "node:path";
import JSZip from "jszip";

import { AiMappingTimeoutError, ValidationError } from "@/core/errors/app-error";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { RepeaterSuggestionItem } from "@/app/report/mapping/types";
import { aiMappingService } from "@/services/ai-mapping.service";
import { securityService } from "@/services/security.service";
import { extractParagraphs, type DocxParagraph } from "@/services/auto-tagging.service";

export type DocxFieldSuggestion = {
  fieldKey: string;
  proposedValue: string;
  confidenceScore: number;
  source: "docx_ai";
};

type Input = {
  buffer: Buffer;
  filename?: string;
  fieldCatalog: FieldCatalogItem[];
  timeoutMs?: number;
};

type Output = {
  suggestions: DocxFieldSuggestion[];
  repeaterSuggestions: RepeaterSuggestionItem[];
  meta: {
    provider: "docx_ai";
    extractedTextLength: number;
    masked: true;
    paragraphCount: number;
  };
};

const XML_PARTS_RE = /^word\/(document|header\d+|footer\d+)\.xml$/;
const W_TABLE_RE = /<w:tbl[\s\S]*?<\/w:tbl>/g;
const W_ROW_RE = /<w:tr[\s\S]*?<\/w:tr>/g;
const W_CELL_RE = /<w:tc[\s\S]*?<\/w:tc>/g;
const W_TEXT_RE = /<w:t(?=[\s>])[^>]*>([\s\S]*?)<\/w:t>/g;

function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ── Fuzzy token matching (local copy from ai-mapping.service) ── */

function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean);
}

function scoreTokenOverlap(a: string, b: string): number {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }
  return overlap / Math.max(aTokens.size, bTokens.size);
}

function decodeXmlText(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function lineValueAfterLabel(label: string, lines: string[]): string | undefined {
  const normalizedLabel = normalizeText(label);
  for (const line of lines) {
    const raw = line.trim();
    if (!raw) continue;
    const normalized = normalizeText(raw);
    if (!normalized || !normalized.includes(normalizedLabel)) continue;
    const split = raw.split(/[:\-]/);
    if (split.length < 2) continue;
    const value = split.slice(1).join(":").trim();
    if (value) return value;
  }
  return undefined;
}

function extractCellText(cellXml: string): string {
  const parts: string[] = [];
  for (const match of cellXml.matchAll(W_TEXT_RE)) {
    if (match[1]) parts.push(match[1]);
  }
  return decodeXmlText(parts.join("")).trim();
}

function buildHeaderValueCandidates(text: string): { headers: string[]; valueByHeader: Record<string, string> } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headers: string[] = [];
  const valueByHeader: Record<string, string> = {};

  for (const line of lines) {
    const split = line.split(/[:\-]/);
    if (split.length < 2) continue;
    const header = split[0].trim();
    const value = split.slice(1).join(":").trim();
    if (!header || !value) continue;
    headers.push(header);
    valueByHeader[header] = value;
  }

  return { headers: [...new Set(headers)], valueByHeader };
}

function extractByHeuristic(text: string, fieldCatalog: FieldCatalogItem[]): DocxFieldSuggestion[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const suggestions: DocxFieldSuggestion[] = [];

  for (const field of fieldCatalog) {
    const proposed = lineValueAfterLabel(field.label_vi, lines);
    if (!proposed) continue;
    suggestions.push({
      fieldKey: field.field_key,
      proposedValue: proposed,
      confidenceScore: 0.68,
      source: "docx_ai",
    });
  }
  return suggestions;
}

function dedupeByField(suggestions: DocxFieldSuggestion[]): DocxFieldSuggestion[] {
  const byField = new Map<string, DocxFieldSuggestion>();
  for (const item of suggestions) {
    const existing = byField.get(item.fieldKey);
    if (!existing || item.confidenceScore > existing.confidenceScore) {
      byField.set(item.fieldKey, item);
    }
  }
  return [...byField.values()];
}

type ParsedTable = { headers: string[]; rows: string[][] };

function parsePipeTableRows(text: string): Array<{ headers: string[]; rows: string[][] }> {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const tables: Array<{ headers: string[]; rows: string[][] }> = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.includes("|")) {
      i += 1;
      continue;
    }
    const headerCells = line
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean);
    if (headerCells.length < 2) {
      i += 1;
      continue;
    }
    const rowItems: string[][] = [];
    let j = i + 1;
    while (j < lines.length && lines[j].includes("|")) {
      const cells = lines[j]
        .split("|")
        .map((x) => x.trim())
        .filter(Boolean);
      if (cells.length === headerCells.length) {
        rowItems.push(cells);
      }
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

async function parseXmlTablesFromDocx(buffer: Buffer): Promise<ParsedTable[]> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return [];
  }

  const xmlParts = Object.keys(zip.files)
    .filter((name) => XML_PARTS_RE.test(name))
    .sort();
  const parsedTables: ParsedTable[] = [];

  for (const xmlPath of xmlParts) {
    const xml = await zip.file(xmlPath)?.async("string");
    if (!xml) continue;
    for (const tableMatch of xml.matchAll(W_TABLE_RE)) {
      const tableXml = tableMatch[0];
      const rowCells = [...tableXml.matchAll(W_ROW_RE)]
        .map((rowMatch) => {
          const rowXml = rowMatch[0];
          return [...rowXml.matchAll(W_CELL_RE)].map((cellMatch) => extractCellText(cellMatch[0]));
        })
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

/* ── Raw table parsing (all rows, no header assumption) ── */

type RawParsedTable = { columnCount: number; rows: string[][] };

async function parseXmlTablesRaw(buffer: Buffer): Promise<RawParsedTable[]> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return [];
  }
  const xmlParts = Object.keys(zip.files)
    .filter((name) => XML_PARTS_RE.test(name))
    .sort();
  const tables: RawParsedTable[] = [];

  for (const xmlPath of xmlParts) {
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

/* ── Scalar field extraction from 2-column info tables ── */

const TABLE_SCALAR_THRESHOLD = 0.4;
const TABLE_SCALAR_CONFIDENCE = 0.75;

function extractScalarFieldsFromTables(
  tables: RawParsedTable[],
  scalarCatalog: FieldCatalogItem[],
): DocxFieldSuggestion[] {
  const suggestions: DocxFieldSuggestion[] = [];
  const matchedKeys = new Set<string>();

  for (const table of tables) {
    if (table.columnCount !== 2) continue;
    for (const row of table.rows) {
      const cellLabel = row[0];
      const cellValue = row[1];
      if (!cellLabel.trim() || !cellValue.trim()) continue;

      let bestField: FieldCatalogItem | null = null;
      let bestScore = 0;
      for (const field of scalarCatalog) {
        if (matchedKeys.has(field.field_key)) continue;
        const score = scoreTokenOverlap(cellLabel, field.label_vi);
        if (score > bestScore && score >= TABLE_SCALAR_THRESHOLD) {
          bestScore = score;
          bestField = field;
        }
      }

      if (bestField) {
        const typedValue = toTypedValue(cellValue, bestField.type);
        const proposedValue =
          typedValue === null || typedValue === "" ? cellValue : String(typedValue);
        suggestions.push({
          fieldKey: bestField.field_key,
          proposedValue: securityService.scrubSensitiveData(proposedValue),
          confidenceScore: TABLE_SCALAR_CONFIDENCE,
          source: "docx_ai",
        });
        matchedKeys.add(bestField.field_key);
      }
    }
  }
  return suggestions;
}

/* ── Adjacent paragraph extraction (label on line N, value on line N+1) ── */

const ADJACENT_PARA_THRESHOLD = 0.5;
const ADJACENT_PARA_CONFIDENCE = 0.65;
const MAX_LABEL_LENGTH = 120;
const MAX_VALUE_LENGTH = 500;

function extractFromAdjacentParagraphs(
  paragraphs: DocxParagraph[],
  scalarCatalog: FieldCatalogItem[],
  alreadyMatched: Set<string>,
): DocxFieldSuggestion[] {
  const suggestions: DocxFieldSuggestion[] = [];
  const matchedKeys = new Set<string>(alreadyMatched);

  for (let i = 0; i < paragraphs.length - 1; i++) {
    const paraText = paragraphs[i].text.trim();
    if (!paraText || paraText.length > MAX_LABEL_LENGTH) continue;
    // Skip lines that already have delimiters (handled by buildHeaderValueCandidates)
    if (/[:\u2013\-]/.test(paraText)) {
      const parts = paraText.split(/[:\u2013\-]/);
      if (parts.length >= 2 && parts[0].trim() && parts.slice(1).join("").trim()) continue;
    }

    let bestField: FieldCatalogItem | null = null;
    let bestScore = 0;
    for (const field of scalarCatalog) {
      if (matchedKeys.has(field.field_key)) continue;
      const score = scoreTokenOverlap(paraText, field.label_vi);
      if (score > bestScore && score >= ADJACENT_PARA_THRESHOLD) {
        bestScore = score;
        bestField = field;
      }
    }
    if (!bestField) continue;

    const nextText = paragraphs[i + 1].text.trim();
    if (!nextText || nextText.length > MAX_VALUE_LENGTH) continue;
    // Guard: if next paragraph also matches a field label, it's a label, not a value
    let looksLikeLabel = false;
    for (const field of scalarCatalog) {
      if (scoreTokenOverlap(nextText, field.label_vi) >= ADJACENT_PARA_THRESHOLD) {
        looksLikeLabel = true;
        break;
      }
    }
    if (looksLikeLabel) continue;

    const typedValue = toTypedValue(nextText, bestField.type);
    const proposedValue =
      typedValue === null || typedValue === "" ? nextText : String(typedValue);
    suggestions.push({
      fieldKey: bestField.field_key,
      proposedValue: securityService.scrubSensitiveData(proposedValue),
      confidenceScore: ADJACENT_PARA_CONFIDENCE,
      source: "docx_ai",
    });
    matchedKeys.add(bestField.field_key);
  }
  return suggestions;
}

type RepeaterGroupMeta = {
  groupPath: string;
  fieldKeys: string[];
  fieldLabels: string[];
};

function buildRepeaterGroupMetas(fieldCatalog: FieldCatalogItem[]): RepeaterGroupMeta[] {
  const map = new Map<string, RepeaterGroupMeta>();
  for (const field of fieldCatalog) {
    if (!field.is_repeater) continue;
    const groupPath = String(field.group ?? "").trim();
    if (!groupPath) continue;
    const existing = map.get(groupPath);
    if (existing) {
      existing.fieldKeys.push(field.field_key);
      existing.fieldLabels.push(field.label_vi);
      continue;
    }
    map.set(groupPath, {
      groupPath,
      fieldKeys: [field.field_key],
      fieldLabels: [field.label_vi],
    });
  }
  return [...map.values()];
}

function toTypedValue(raw: string, fieldType: FieldCatalogItem["type"]): string | number | boolean | null {
  const value = raw.trim();
  if (!value) return "";
  if (fieldType === "number" || fieldType === "percent") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : value;
  }
  if (fieldType === "date") return value;
  return value;
}

async function extractRepeaterSuggestions(input: {
  buffer: Buffer;
  scrubbedText: string;
  fieldCatalog: FieldCatalogItem[];
}): Promise<RepeaterSuggestionItem[]> {
  const groupMetas = buildRepeaterGroupMetas(input.fieldCatalog);
  if (groupMetas.length === 0) return [];

  const xmlTables = await parseXmlTablesFromDocx(input.buffer);
  const pipeTables = parsePipeTableRows(input.scrubbedText);
  const tables = [...xmlTables, ...pipeTables];
  if (tables.length === 0) return [];

  const typeByKey = new Map(input.fieldCatalog.map((f) => [f.field_key, f.type]));
  const results: RepeaterSuggestionItem[] = [];
  const usedGroups = new Set<string>();

  for (const table of tables) {
    let bestGroup: RepeaterGroupMeta | null = null;
    let bestMapping: Record<string, string> = {};
    let bestScore = 0;

    for (const meta of groupMetas) {
      if (usedGroups.has(meta.groupPath)) continue;
      const mapped = await aiMappingService.suggestMapping(table.headers, meta.fieldLabels, {
        includeGrouping: false,
      });
      const matchedPairs = Object.entries(mapped.mapping);
      if (matchedPairs.length === 0) continue;
      const score = matchedPairs.length / Math.max(1, meta.fieldLabels.length);
      if (score > bestScore) {
        bestScore = score;
        bestGroup = meta;
        bestMapping = mapped.mapping;
      }
    }

    if (!bestGroup || bestScore < 0.3) continue;
    const fieldKeyByLabel = new Map(
      input.fieldCatalog
        .filter((f) => f.group === bestGroup.groupPath && f.is_repeater)
        .map((f) => [f.label_vi, f.field_key]),
    );
    const tableHeaderIndex = new Map(table.headers.map((h, idx) => [h, idx]));
    const rows = table.rows
      .map((cells) => {
        const rowObj: Record<string, string | number | boolean | null> = {};
        for (const [fieldLabel, mappedHeader] of Object.entries(bestMapping)) {
          const fieldKey = fieldKeyByLabel.get(fieldLabel);
          const index = tableHeaderIndex.get(mappedHeader);
          if (!fieldKey || index === undefined) continue;
          const raw = cells[index] ?? "";
          const fieldType = typeByKey.get(fieldKey) ?? "text";
          rowObj[fieldKey] = toTypedValue(raw, fieldType);
        }
        return rowObj;
      })
      .filter((row) => Object.keys(row).length > 0);

    if (rows.length === 0) continue;
    usedGroups.add(bestGroup.groupPath);
    results.push({
      groupPath: bestGroup.groupPath,
      fieldKeys: bestGroup.fieldKeys,
      rows,
      confidenceScore: Math.min(0.95, Math.max(0.55, bestScore)),
      status: "pending",
      source: "docx_ai",
    });
  }

  return results;
}

export async function extractFieldsFromDocxReport(input: Input): Promise<Output> {
  if (!Array.isArray(input.fieldCatalog) || input.fieldCatalog.length === 0) {
    throw new ValidationError("fieldCatalog is required.");
  }
  const ext = path.extname(input.filename ?? "").toLowerCase();
  if (ext !== ".docx") {
    throw new ValidationError("Only .docx files are supported for DOCX extract.");
  }

  const timeoutMs = Math.max(5_000, input.timeoutMs ?? 35_000);
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      clearTimeout(timer);
      reject(new AiMappingTimeoutError("DOCX extraction timed out."));
    }, timeoutMs);
  });

  const parsePromise = extractParagraphs(input.buffer);
  const paragraphs = await Promise.race([parsePromise, timeoutPromise]);
  if (paragraphs.length === 0) {
    throw new ValidationError("DOCX file does not contain readable text.");
  }

  const rawText = paragraphs.map((p) => p.text).join("\n");
  const scrubbed = securityService.scrubSensitiveData(rawText);

  // Separate scalar fields from repeater fields
  const scalarCatalog = input.fieldCatalog.filter((f) => !f.is_repeater);

  // ── Step 1: Table-based scalar extraction (fast, no API calls) ──
  const rawTables = await parseXmlTablesRaw(input.buffer);
  const tableSuggestions = extractScalarFieldsFromTables(rawTables, scalarCatalog);

  // ── Step 2: Adjacent paragraph extraction (fast, no API calls) ──
  const tableMatchedKeys = new Set(tableSuggestions.map((s) => s.fieldKey));
  const adjacentSuggestions = extractFromAdjacentParagraphs(
    paragraphs,
    scalarCatalog,
    tableMatchedKeys,
  );

  // ── Step 3: Existing header:value + AI mapping ──
  const { headers, valueByHeader } = buildHeaderValueCandidates(scrubbed);
  let aiSuggestions: DocxFieldSuggestion[] = [];
  if (headers.length > 0) {
    const mapped = await aiMappingService.suggestMapping(
      headers,
      input.fieldCatalog.map((f) => f.label_vi),
      { includeGrouping: false },
    );
    const fieldKeyByLabel = new Map(input.fieldCatalog.map((f) => [f.label_vi, f.field_key]));
    aiSuggestions = Object.entries(mapped.mapping)
      .map(([fieldLabel, matchedHeader]) => {
        const fieldKey = fieldKeyByLabel.get(fieldLabel);
        const proposedValue = valueByHeader[matchedHeader];
        if (!fieldKey || !proposedValue) return null;
        return {
          fieldKey,
          proposedValue,
          confidenceScore: 0.82,
          source: "docx_ai" as const,
        };
      })
      .filter((item): item is DocxFieldSuggestion => Boolean(item));
  }

  // ── Step 4: Heuristic fallback (only if AI yields nothing) ──
  let heuristicSuggestions: DocxFieldSuggestion[] = [];
  if (aiSuggestions.length === 0) {
    heuristicSuggestions = extractByHeuristic(scrubbed, input.fieldCatalog);
  }

  // ── Step 5: Merge all sources, keep highest confidence per field_key ──
  const allSuggestions = [
    ...tableSuggestions,
    ...adjacentSuggestions,
    ...aiSuggestions,
    ...heuristicSuggestions,
  ];

  // ── Step 6: Repeater extraction (unchanged) ──
  const repeaterSuggestions = await extractRepeaterSuggestions({
    buffer: input.buffer,
    scrubbedText: scrubbed,
    fieldCatalog: input.fieldCatalog,
  });

  return {
    suggestions: dedupeByField(allSuggestions),
    repeaterSuggestions,
    meta: {
      provider: "docx_ai",
      extractedTextLength: scrubbed.length,
      masked: true,
      paragraphCount: paragraphs.length,
    },
  };
}
