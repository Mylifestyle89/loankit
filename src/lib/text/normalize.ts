/**
 * Text normalization utilities for fuzzy matching and data extraction.
 * Single source of truth for text processing functions.
 */

/** Normalize Vietnamese text for fuzzy matching: strip diacritics, lowercase, collapse whitespace. */
export function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split text into normalized tokens for overlap scoring. */
export function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Score overlap between two strings by shared tokens. Range: 0..1 */
export function scoreTokenOverlap(a: string, b: string): number {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }
  return overlap / Math.max(aTokens.size, bTokens.size);
}

/** Decode XML entities to plain text. */
export function decodeXmlText(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
