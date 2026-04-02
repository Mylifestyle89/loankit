// Shared number parsing utilities for XLSX loan plan parsers
// Handles Vietnamese number formatting (thousand-sep dots, comma decimals)

/** Parse number, handling VND formatting (thousand-sep dots) while preserving real decimals */
export function parseNum(val: unknown): number {
  if (typeof val === "number") return val;
  let s = String(val).replace(/[\sđ%]/g, "");
  // Strip thousand-separator dots (digit.digit{3}), then replace comma with dot for decimal
  s = s.replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

/** Parse decimal value (diện tích, tỷ lệ) — more lenient than parseNum */
export function parseDecimal(val: unknown): number {
  if (typeof val === "number") return val;
  const s = String(val).replace(/[\sđ%]/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
