/**
 * Pure client-safe utilities for placeholder matching.
 * No Node.js / file-system imports — safe to import in Client Components.
 */

export function suggestAliasForPlaceholder(placeholder: string, fieldKeys: string[]): string[] {
  // Strip prefix (e.g. "group.field_name" → "field_name") before normalizing
  const raw = placeholder.trim().toLowerCase();
  const noPrefix = raw.includes(".") ? raw.split(".").slice(1).join(".") : raw;
  const normalized = noPrefix.replaceAll(/[\s_.]/g, "");
  return fieldKeys
    .filter((field) => {
      const key = field.toLowerCase().replaceAll(/[\s_]/g, "");
      return key.includes(normalized) || normalized.includes(key);
    })
    .sort((a, b) => a.length - b.length)
    .slice(0, 5);
}
