/** Format a numeric value with VN thousands separator (dot).
 *  Accepts number, numeric string, or already-formatted string.
 *  Returns empty string for falsy/non-numeric input. */
export function fmtN(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  const s = String(v).replace(/\./g, "").replace(/,/g, ".").trim();
  const n = Number(s);
  if (!Number.isFinite(n)) return String(v); // not a number, return as-is
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}
