/**
 * Repeater (multi-row) field extraction from DOCX tables.
 * Matches table headers against repeater field groups via AI mapping.
 */

import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { RepeaterSuggestionItem } from "@/app/report/mapping/types";
import { aiMappingService } from "@/services/ai-mapping.service";
import { parseXmlTablesFromDocx, parsePipeTableRows, type ParsedTable } from "./extraction-docx-xml-parser";
import { toTypedValue } from "./extraction-text-helpers";

// --- Types ---

type RepeaterGroupMeta = {
  groupPath: string;
  fieldKeys: string[];
  fieldLabels: string[];
};

// --- Helpers ---

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

/** Match a single table against repeater groups, return best match. */
async function matchTableToGroup(
  table: ParsedTable,
  groupMetas: RepeaterGroupMeta[],
  usedGroups: Set<string>,
  fieldCatalog: FieldCatalogItem[],
): Promise<{ group: RepeaterGroupMeta; mapping: Record<string, string>; score: number } | null> {
  let bestGroup: RepeaterGroupMeta | null = null;
  let bestMapping: Record<string, string> = {};
  let bestScore = 0;

  for (const meta of groupMetas) {
    if (usedGroups.has(meta.groupPath)) continue;
    const repeaterHints = fieldCatalog
      .filter((f) => f.group === meta.groupPath && f.is_repeater)
      .map((f) => ({
        key: f.label_vi,
        label: f.label_vi,
        type: f.type,
        examples: f.examples?.length ? f.examples : undefined,
        isRepeater: true as const,
      }));
    const mapped = await aiMappingService.suggestMapping(table.headers, meta.fieldLabels, {
      includeGrouping: false,
      fieldHints: repeaterHints.length > 0 ? repeaterHints : undefined,
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

  if (!bestGroup || bestScore < 0.3) return null;
  return { group: bestGroup, mapping: bestMapping, score: bestScore };
}

// --- Main export ---

export async function extractRepeaterSuggestions(input: {
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
    const match = await matchTableToGroup(table, groupMetas, usedGroups, input.fieldCatalog);
    if (!match) continue;

    const { group, mapping, score } = match;
    const fieldKeyByLabel = new Map(
      input.fieldCatalog
        .filter((f) => f.group === group.groupPath && f.is_repeater)
        .map((f) => [f.label_vi, f.field_key]),
    );
    const tableHeaderIndex = new Map(table.headers.map((h, idx) => [h, idx]));
    const rows = table.rows
      .map((cells) => {
        const rowObj: Record<string, string | number | boolean | null> = {};
        for (const [fieldLabel, mappedHeader] of Object.entries(mapping)) {
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
    usedGroups.add(group.groupPath);
    results.push({
      groupPath: group.groupPath,
      fieldKeys: group.fieldKeys,
      rows,
      confidenceScore: Math.min(0.95, Math.max(0.55, score)),
      status: "pending",
      source: "docx_ai",
    });
  }

  return results;
}
