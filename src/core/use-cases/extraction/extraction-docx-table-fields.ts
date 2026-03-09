/**
 * Scalar field extraction from 2-column DOCX tables.
 * Matches cell labels against field catalog using token overlap scoring.
 */

import { securityService } from "@/services/security.service";
import type { FieldCatalogItem } from "@/lib/report/config-schema";
import type { RawParsedTable } from "./extraction-docx-xml-parser";
import { scoreTokenOverlap, toTypedValue, type FieldSuggestion } from "./extraction-text-helpers";

const TABLE_SCALAR_THRESHOLD = 0.4;
const TABLE_SCALAR_CONFIDENCE = 0.75;

/** Extract scalar fields from 2-column info tables (label | value). */
export function extractScalarFieldsFromTables(
  tables: RawParsedTable[],
  scalarCatalog: FieldCatalogItem[],
): FieldSuggestion[] {
  const suggestions: FieldSuggestion[] = [];
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
        // Don't mask numeric/financial fields
        const scrubbedValue = ["number", "percent"].includes(bestField.type)
          ? proposedValue
          : securityService.scrubSensitiveData(proposedValue);
        suggestions.push({
          fieldKey: bestField.field_key,
          proposedValue: scrubbedValue,
          confidenceScore: TABLE_SCALAR_CONFIDENCE,
          source: "docx_ai",
        });
        matchedKeys.add(bestField.field_key);
      }
    }
  }
  return suggestions;
}
