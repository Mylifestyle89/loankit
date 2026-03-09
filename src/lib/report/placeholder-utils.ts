/**
 * Pure client-safe utilities for placeholder matching.
 * No Node.js / file-system imports — safe to import in Client Components.
 */

import { distance } from "fastest-levenshtein";

export function suggestAliasForPlaceholder(placeholder: string, fieldKeys: string[]): string[] {
  // Strip prefix (e.g. "group.field_name" → "field_name") before normalizing
  const raw = placeholder.trim().toLowerCase();
  const noPrefix = raw.includes(".") ? raw.split(".").slice(1).join(".") : raw;
  const normalized = noPrefix.replaceAll(/[\s_.]/g, "");

  // Score each field key by combined Levenshtein + substring match
  const scored = fieldKeys.map((field) => {
    const key = field.toLowerCase().replaceAll(/[\s_]/g, "");
    const editDist = distance(normalized, key);
    const isSubstring = key.includes(normalized) || normalized.includes(key);
    // Prioritize: exact substring match (score 0), then edit distance
    const score = isSubstring ? Math.min(editDist, 1) : editDist;
    return { field, score };
  });

  return scored
    .filter((s) => s.score <= 3)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map((s) => s.field);
}
