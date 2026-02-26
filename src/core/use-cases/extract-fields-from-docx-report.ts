import path from "node:path";
import JSZip from "jszip";

import { AiMappingTimeoutError, ValidationError } from "@/core/errors/app-error";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { RepeaterSuggestionItem } from "@/app/report/mapping/types";
import { aiMappingService } from "@/services/ai-mapping.service";
import { securityService } from "@/services/security.service";
import { extractParagraphs } from "@/services/auto-tagging.service";

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
  const { headers, valueByHeader } = buildHeaderValueCandidates(scrubbed);

  let suggestions: DocxFieldSuggestion[] = [];
  if (headers.length > 0) {
    const mapped = await aiMappingService.suggestMapping(
      headers,
      input.fieldCatalog.map((f) => f.label_vi),
      { includeGrouping: false },
    );
    const fieldKeyByLabel = new Map(input.fieldCatalog.map((f) => [f.label_vi, f.field_key]));
    suggestions = Object.entries(mapped.mapping)
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

  if (suggestions.length === 0) {
    suggestions = extractByHeuristic(scrubbed, input.fieldCatalog);
  }
  const repeaterSuggestions = await extractRepeaterSuggestions({
    buffer: input.buffer,
    scrubbedText: scrubbed,
    fieldCatalog: input.fieldCatalog,
  });

  return {
    suggestions: dedupeByField(suggestions),
    repeaterSuggestions,
    meta: {
      provider: "docx_ai",
      extractedTextLength: scrubbed.length,
      masked: true,
      paragraphCount: paragraphs.length,
    },
  };
}
