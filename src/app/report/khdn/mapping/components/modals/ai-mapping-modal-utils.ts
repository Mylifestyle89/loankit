// Utility functions for AiMappingModal

import type { ChipVariant } from "./ai-mapping-modal-types";

/** Parse raw header string (newline or comma separated) into unique trimmed array */
export function parseHeaders(raw: string): string[] {
  return [...new Set(raw.split(/[\n,]+/g).map((s) => s.trim()).filter(Boolean))];
}

/** Determine chip variant based on grouping config */
export function getChipVariant(
  placeholder: string,
  grouping: { groupKey: string; repeatKey: string } | undefined,
): ChipVariant {
  if (!grouping) return "single";
  const p = placeholder.trim();
  if (p === grouping.groupKey) return "root";
  if (p === grouping.repeatKey || p.includes(grouping.repeatKey)) return "repeater";
  return "single";
}
