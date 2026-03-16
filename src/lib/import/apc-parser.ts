import type { ApcJsonFile, ApcParseResult } from "./apc-types";

const DATA_TYPE_MAP: Record<number, string> = {
  0: "text",
  1: "number",
  2: "richtext",
  3: "date",
};

/**
 * Parse .APC file (loan method template schema).
 * Extracts field definitions, asset categories, and document list.
 */
export function parseApcFile(jsonContent: string): ApcParseResult {
  try {
    const apc = JSON.parse(jsonContent) as ApcJsonFile;

    if (!apc.Attributes || !Array.isArray(apc.Attributes)) {
      return { status: "error", message: "Invalid .APC: missing Attributes array", title: "", attributes: [], assetCategories: [], documents: [] };
    }

    const attributes = apc.Attributes
      .filter((a) => a.IsShow)
      .sort((a, b) => a.Position - b.Position)
      .map((a) => ({
        name: a.Title,
        dataType: DATA_TYPE_MAP[a.DataType] ?? "text",
        isPrimary: a.IsPrimary,
        isSearch: a.IsSearch,
        position: a.Position,
      }));

    const assetCategories = (apc.AssetCategories ?? [])
      .filter((cat) => cat.IsShow)
      .map((cat) => ({
        name: cat.Category,
        code: cat.Code,
        fields: cat.Attributes
          .filter((a) => a.IsShow)
          .sort((a, b) => a.Position - b.Position)
          .map((a) => ({
            name: a.Title,
            dataType: DATA_TYPE_MAP[a.DataType] ?? "text",
            position: a.Position,
          })),
      }));

    const documents = (apc.Documents ?? [])
      .filter((d) => d.IsShow)
      .sort((a, b) => a.Position - b.Position)
      .map((d) => ({
        fileId: d.FileId,
        buttonName: d.ButtonName,
        fileName: d.FileName,
        position: d.Position,
      }));

    return {
      status: "success",
      message: `Parsed "${apc.Title}": ${attributes.length} fields, ${assetCategories.length} asset types, ${documents.length} documents`,
      title: apc.Title ?? "",
      attributes,
      assetCategories,
      documents,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { status: "error", message: `Failed to parse .APC: ${message}`, title: "", attributes: [], assetCategories: [], documents: [] };
  }
}
