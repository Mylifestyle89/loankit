/**
 * Vietnamese locale number formatter helpers — used by inputs that need to
 * display "1.234.567" while keeping a raw integer in state.
 *
 * formatVndNumber: number/string → "1.234.567" (empty string if zero/NaN so
 * the input does not show a distracting "0" on empty fields).
 * parseVndNumber:  "1.234.567" → 1234567 (strips every non-digit character).
 */

const VND_FORMATTER = new Intl.NumberFormat("vi-VN");

/** Format a number for display in a text input. Returns "" for 0/NaN. */
export function formatVndNumber(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "";
  const n = typeof val === "string" ? parseVndNumber(val) : val;
  if (!Number.isFinite(n) || n === 0) return "";
  return VND_FORMATTER.format(n);
}

/** Parse a locale-formatted string back to a number. Returns 0 for empty/invalid. */
export function parseVndNumber(str: string | number | null | undefined): number {
  if (typeof str === "number") return Number.isFinite(str) ? str : 0;
  if (!str) return 0;
  const digits = String(str).replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

/**
 * Format a VND value for display with currency suffix. Returns "—" (em dash)
 * for null/undefined/NaN/non-finite — banking-safe placeholder, never shows
 * "NaNđ" or empty string in summary fields.
 */
export function formatVnd(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "—";
  const n = typeof val === "string" ? parseVndNumber(val) : val;
  if (!Number.isFinite(n)) return "—";
  return VND_FORMATTER.format(n) + "đ";
}
