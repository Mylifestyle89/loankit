/**
 * fs-store mapping I/O — read/parse mapping and alias files, build field catalog,
 * merge financial catalog.
 */
import path from "node:path";

import {
  aliasMapSchema,
  type AliasMap,
  type FieldCatalogItem,
  type MappingMaster,
  mappingMasterSchema,
} from "@/lib/report/config-schema";
import {
  inferType,
  readJsonFile,
  toGroup,
} from "@/lib/report/fs-store-helpers";
import { translateFieldLabelVi } from "@/lib/report/field-labels";
import { FINANCIAL_FIELD_CATALOG } from "@/lib/report/financial-field-catalog";

export async function readMappingFile(mappingPath: string): Promise<MappingMaster> {
  const absolute = path.join(process.cwd(), mappingPath);
  const parsed = await readJsonFile<unknown>(absolute);
  return mappingMasterSchema.parse(parsed);
}

/** Parse mapping JSON from inline DB string (avoids filesystem read). */
export function parseMappingJson(json: string): MappingMaster {
  return mappingMasterSchema.parse(JSON.parse(json));
}

export async function readAliasFile(aliasPath: string): Promise<AliasMap> {
  const absolute = path.join(process.cwd(), aliasPath);
  const parsed = await readJsonFile<unknown>(absolute);
  return aliasMapSchema.parse(parsed);
}

/** Parse alias JSON from inline DB string (avoids filesystem read). */
export function parseAliasJson(json: string): AliasMap {
  return aliasMapSchema.parse(JSON.parse(json));
}

export function buildCatalog(mapping: MappingMaster): FieldCatalogItem[] {
  return mapping.mappings.map((item) => ({
    field_key: item.template_field,
    label_vi: translateFieldLabelVi(item.template_field),
    group: toGroup(item.template_field),
    type: inferType(item.template_field, item.normalizer),
    required: item.status !== "MISSING",
    normalizer: item.normalizer,
    examples: item.sources.map((source) => `${source.source}:${source.path}`),
  }));
}

/**
 * Merge FINANCIAL_FIELD_CATALOG items into the existing catalog.
 * Idempotent: only adds items whose field_key does not already exist.
 */
export function mergeFinancialCatalog(catalog: FieldCatalogItem[]): {
  catalog: FieldCatalogItem[];
  changed: boolean;
} {
  const existing = new Set(catalog.map((item) => item.field_key));
  const toAdd = FINANCIAL_FIELD_CATALOG.filter((item) => !existing.has(item.field_key));
  if (toAdd.length === 0) return { catalog, changed: false };
  return { catalog: [...catalog, ...toAdd], changed: true };
}
