import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { translateFieldLabelVi, translateGroupVi } from "@/lib/report/field-labels";
import { BK_TO_FRAMEWORK_MAPPING, FRAMEWORK_TO_BK_LABEL } from "./bk-mapping";
import {
  isEmptyValue,
  normalizeAttributeValue,
} from "./bk-normalizer";
import type {
  BkJsonFile,
  BkImportResult,
} from "./bk-types";

/**
 * Import .BK file and map to FrameworkState structure
 * @param jsonContent - Raw JSON string from .bk file
 * @returns BkImportResult with mapped values ready for FrameworkState
 */
export function importBkFile(jsonContent: string): BkImportResult {
  const startTime = Date.now();
  const skippedFields: string[] = [];
  let attributesMapped = 0;

  try {
    // Parse JSON
    const bkData = JSON.parse(jsonContent) as BkJsonFile;

    // Validate structure
    if (!bkData.Clients || !Array.isArray(bkData.Clients) || bkData.Clients.length === 0) {
      return {
        status: "error",
        message: "Invalid .BK file: missing or empty Clients array",
        values: {},
        metadata: {
          sourceFile: "Unknown",
          importedAt: new Date().toISOString(),
          attributesMapped: 0,
          assetsMapped: 0,
          skippedFields: [],
        },
      };
    }

    // Get first client
    const client = bkData.Clients[0];
    if (!client.ClientAttributes || !Array.isArray(client.ClientAttributes)) {
      return {
        status: "error",
        message: "Invalid client: missing ClientAttributes array",
        values: {},
        metadata: {
          sourceFile: client.Title || "Unknown",
          importedAt: new Date().toISOString(),
          attributesMapped: 0,
          assetsMapped: 0,
          skippedFields: [],
        },
      };
    }

    const values: Record<string, string> = {};

    // Process ClientAttributes
    for (const attr of client.ClientAttributes) {
      const frameworkKey = BK_TO_FRAMEWORK_MAPPING[attr.Key];

      if (!frameworkKey) {
        skippedFields.push(`${attr.Key}`);
        continue;
      }

      const normalized = normalizeAttributeValue(attr.Value, frameworkKey);
      if (normalized) {
        values[frameworkKey] = normalized;
        attributesMapped++;
      }
    }

    const duration = Date.now() - startTime;

    return {
      status: skippedFields.length === 0 ? "success" : "partial",
      message:
        skippedFields.length === 0
          ? `Successfully imported ${attributesMapped} attributes from ${client.Title}`
          : `Imported ${attributesMapped} attributes, skipped ${skippedFields.length} unmapped fields`,
      values,
      metadata: {
        sourceFile: client.Title,
        importedAt: new Date().toISOString(),
        attributesMapped,
        assetsMapped: 0,
        skippedFields: skippedFields.slice(0, 10), // First 10
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error during import";
    return {
      status: "error",
      message: `Failed to import .BK file: ${message}`,
      values: {},
      metadata: {
        sourceFile: "Unknown",
        importedAt: new Date().toISOString(),
        attributesMapped: 0,
        assetsMapped: 0,
        skippedFields: [message],
      },
    };
  }
}

/**
 * Generate FieldCatalogItem[] from imported BK values.
 * Used for "template + data" mode — creates field definitions alongside data.
 */
export function generateFieldCatalogFromBk(
  values: Record<string, string>,
): FieldCatalogItem[] {
  return Object.keys(values).map((fieldKey) => {
    const chunks = fieldKey.split(".");
    const groupRaw = chunks.length > 1 ? `${chunks[0]}.${chunks[1]}` : chunks[0];

    // Vietnamese label: prefer existing lookup → BK original name → fallback
    const existingLabel = translateFieldLabelVi(fieldKey);
    const bkLabel = FRAMEWORK_TO_BK_LABEL[fieldKey];
    const label_vi = existingLabel !== fieldKey ? existingLabel : (bkLabel ?? fieldKey);

    // Infer type from key name
    let type: FieldCatalogItem["type"] = "text";
    if (fieldKey.includes("date")) type = "date";
    else if (/capital|assets|equity|amount|outstanding|loan|rate|interest/.test(fieldKey))
      type = "number";

    return {
      field_key: fieldKey,
      label_vi,
      group: translateGroupVi(groupRaw),
      type,
      required: false,
      examples: [],
    };
  });
}
