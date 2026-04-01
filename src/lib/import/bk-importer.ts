import type { FieldCatalogItem } from "@/lib/report/config-schema";
import { translateFieldLabelVi, translateGroupVi } from "@/lib/report/field-labels";
import { BK_TO_FRAMEWORK_MAPPING, BK_ASSET_MAPPING, mapPlanPropertyKey, FRAMEWORK_TO_BK_LABEL } from "./bk-mapping";
import {
  normalizeAttributeValue,
} from "./bk-normalizer";
import type {
  BkJsonFile,
  BkClient,
  BkImportResult,
  BkMultiImportResult,
} from "./bk-types";

/**
 * Parse a single BkClient into BkImportResult
 */
function importSingleClient(client: BkClient): BkImportResult {
  const skippedFields: string[] = [];
  let attributesMapped = 0;

  if (!client.ClientAttributes || !Array.isArray(client.ClientAttributes)) {
    return {
      status: "error",
      message: "Invalid client: missing ClientAttributes array",
      values: {},
      assetGroups: {},
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

  // Process all ClientAssets (HĐTD, SĐ, STK, PA, GN, UNC, VBA, TCTD, TV)
  // Asset codes that can have multiple instances
  const MULTI_ASSET_CODES = new Set(["SĐ", "STK", "VBA", "TCTD", "TV", "GN", "UNC"]);
  const assetGroups: Record<string, Record<string, string>[]> = {};
  let assetsMapped = 0;

  if (client.ClientAssets) {
    for (const asset of client.ClientAssets) {
      const code = asset.Code;
      if (!asset.AssetProperties) continue;

      // PA (Phương án) — dynamic mapping
      if (code === "PA") {
        for (const prop of asset.AssetProperties) {
          const fwKey = mapPlanPropertyKey(prop.Key);
          if (!fwKey) { skippedFields.push(`PA.${prop.Key}`); continue; }
          const normalized = normalizeAttributeValue(prop.Value, fwKey);
          if (normalized) { values[fwKey] = normalized; assetsMapped++; }
        }
        continue;
      }

      // Other assets: use BK_ASSET_MAPPING
      const assetMap = BK_ASSET_MAPPING[code];
      if (!assetMap) {
        for (const prop of asset.AssetProperties) {
          skippedFields.push(`${code}.${prop.Key}`);
        }
        continue;
      }

      // Collect per-instance properties for multi-asset codes
      const instanceValues: Record<string, string> = {};

      for (const prop of asset.AssetProperties) {
        const fwKey = assetMap[prop.Key];
        if (!fwKey) { skippedFields.push(`${code}.${prop.Key}`); continue; }
        const normalized = normalizeAttributeValue(prop.Value, fwKey);
        if (normalized) {
          // Always write to flat values (last instance wins — backward compat)
          values[fwKey] = normalized;
          instanceValues[fwKey] = normalized;
          assetsMapped++;
          // Detect marital status from TV
          if (code === "TV" && prop.Key === "Mối quan hệ với KH vay") {
            const rel = prop.Value.toLowerCase();
            if (rel.includes("chồng") || rel.includes("vợ")) {
              values["A.general.marital_status"] = "married";
            }
          }
        }
      }

      // Store instance in assetGroups for multi-asset codes
      if (MULTI_ASSET_CODES.has(code) && Object.keys(instanceValues).length > 0) {
        if (!assetGroups[code]) assetGroups[code] = [];
        assetGroups[code].push(instanceValues);
      }
    }
  }

  // Auto-detect customer type
  const hasCccd = !!values["A.general.cccd"];
  const hasCharterCapital = !!values["A.general.charter_capital"];
  const detectedCustomerType: "corporate" | "individual" =
    hasCccd && !hasCharterCapital ? "individual" : "corporate";

  if (detectedCustomerType === "individual") {
    values["A.general.customer_type"] = "individual";
  }

  const totalMapped = attributesMapped + assetsMapped;
  return {
    status: skippedFields.length === 0 ? "success" : "partial",
    message:
      skippedFields.length === 0
        ? `Đã import ${totalMapped} trường từ ${client.Title} (${attributesMapped} thuộc tính + ${assetsMapped} tài sản) [${detectedCustomerType}]`
        : `Đã import ${totalMapped} trường, bỏ qua ${skippedFields.length} trường chưa mapping [${detectedCustomerType}]`,
    values,
    assetGroups,
    detectedCustomerType,
    metadata: {
      sourceFile: client.Title,
      importedAt: new Date().toISOString(),
      attributesMapped,
      assetsMapped,
      skippedFields: skippedFields.slice(0, 20),
    },
  };
}

/**
 * Import .BK file — ALL clients
 */
export function importBkFileMulti(jsonContent: string): BkMultiImportResult {
  try {
    const bkData = JSON.parse(jsonContent) as BkJsonFile;
    if (!bkData.Clients || !Array.isArray(bkData.Clients) || bkData.Clients.length === 0) {
      return {
        status: "error",
        message: "Invalid .BK file: missing or empty Clients array",
        clients: [],
        totalClients: 0,
      };
    }

    const clients = bkData.Clients.map((c) => importSingleClient(c));
    const hasError = clients.some((c) => c.status === "error");
    const allSuccess = clients.every((c) => c.status === "success");

    return {
      status: hasError ? "partial" : allSuccess ? "success" : "partial",
      message: `Đã parse ${clients.length} khách hàng từ file .bk`,
      clients,
      totalClients: clients.length,
    };
  } catch (error) {
    console.error("[BK Import] Parse error:", error);
    return {
      status: "error",
      message: "Failed to parse import data",
      clients: [],
      totalClients: 0,
    };
  }
}

/**
 * Generate FieldCatalogItem[] from imported BK values.
 */
export function generateFieldCatalogFromBk(
  values: Record<string, string>,
): FieldCatalogItem[] {
  return Object.keys(values).map((fieldKey) => {
    const chunks = fieldKey.split(".");
    const groupRaw = chunks.length > 1 ? `${chunks[0]}.${chunks[1]}` : chunks[0];

    const existingLabel = translateFieldLabelVi(fieldKey);
    const bkLabel = FRAMEWORK_TO_BK_LABEL[fieldKey];
    const label_vi = existingLabel !== fieldKey ? existingLabel : (bkLabel ?? fieldKey);

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
