/**
 * Đọc số thành chữ tiếng Việt.
 * Hỗ trợ số nguyên và số thập phân, số âm, format VN (1.234,56).
 */

// --- Đọc số thành chữ tiếng Việt ---

const ONES = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const TEENS = ["mười", "mười một", "mười hai", "mười ba", "mười bốn", "mười lăm", "mười sáu", "mười bảy", "mười tám", "mười chín"];
const TENS = ["", "", "hai mươi", "ba mươi", "bốn mươi", "năm mươi", "sáu mươi", "bảy mươi", "tám mươi", "chín mươi"];

function readBlock3(n: number, suffix: string): string {
  if (n === 0) return "";
  const a = Math.floor(n / 100);
  const b = Math.floor((n % 100) / 10);
  const c = n % 10;
  let s = "";
  if (a > 0) s += ONES[a] + " trăm ";
  if (b >= 2) {
    s += TENS[b];
    if (c === 1) s += " mốt";
    else if (c === 5) s += " lăm";
    else if (c > 0) s += " " + ONES[c];
  } else if (b === 1) {
    s += TEENS[c];
  } else if (c > 0) {
    if (a > 0) s += "lẻ ";
    s += ONES[c];
  }
  return (s.trim() + " " + suffix).trim();
}

function normalizeNumericText(raw: number | string): string | null {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    return String(raw);
  }
  const text = raw.trim().replace(/\s+/g, "");
  if (!text) return null;

  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;

  // Case phổ biến VN: 1.234.567,89
  if (unsigned.includes(",") && unsigned.includes(".")) {
    const normalized = unsigned.replace(/\./g, "").replace(",", ".");
    return negative ? `-${normalized}` : normalized;
  }

  // Chỉ có dấu phẩy: coi là phân cách thập phân
  if (unsigned.includes(",")) {
    const normalized = unsigned.replace(",", ".");
    return negative ? `-${normalized}` : normalized;
  }

  // Chỉ có dấu chấm:
  // - Nhiều dấu chấm -> coi là phân cách nghìn
  // - Một dấu chấm -> giữ nguyên (thập phân)
  if ((unsigned.match(/\./g) ?? []).length > 1) {
    const normalized = unsigned.replace(/\./g, "");
    return negative ? `-${normalized}` : normalized;
  }

  return negative ? `-${unsigned}` : unsigned;
}

function readIntegerVi(intPart: number): string {
  if (intPart === 0) return "không";
  const blocks: number[] = [];
  let x = intPart;
  while (x > 0) {
    blocks.push(x % 1000);
    x = Math.floor(x / 1000);
  }
  const units = ["", "nghìn", "triệu", "tỉ", "nghìn tỉ", "triệu tỉ"];
  const parts: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const u = units[i] || "";
    const part = readBlock3(blocks[i], u);
    if (part) parts.unshift(part);
  }
  return parts.join(" ");
}

/**
 * Đọc số tiếng Việt (hỗ trợ cả thập phân).
 * Ví dụ:
 * - 1234567 -> "một triệu hai trăm ba mươi bốn nghìn năm trăm sáu mươi bảy"
 * - 12,05 -> "mười hai phẩy không năm"
 */
export function docso(value: number | string): string {
  const normalized = normalizeNumericText(value);
  if (!normalized) return "";

  const n = Number(normalized);
  if (!Number.isFinite(n)) return "";

  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [intStrRaw, fracStrRaw = ""] = unsigned.split(".");
  const intStr = intStrRaw === "" ? "0" : intStrRaw;
  const intPart = Number(intStr);
  if (!Number.isFinite(intPart)) return "";

  const intWords = readIntegerVi(Math.floor(intPart));

  let result = intWords;
  if (fracStrRaw.length > 0) {
    const digitWords = fracStrRaw
      .split("")
      .map((ch) => {
        const d = Number(ch);
        return Number.isInteger(d) && d >= 0 && d <= 9 ? ONES[d] || "không" : "";
      })
      .filter(Boolean)
      .join(" ");
    if (digitWords) {
      result += ` phẩy ${digitWords}`;
    }
  }

  return negative ? `âm ${result}` : result;
}

/**
 * Đọc số tiếng Việt + đơn vị.
 * Ví dụ: docsocodonvi(1500000, "đồng")
 */
export function docsocodonvi(
  value: number | string,
  unit: string = "đồng",
): string {
  const words = docso(value);
  if (!words) return "";
  return `${words} ${unit}`;
}

// Backward-compatible alias (không phá code cũ)
export const numberToWordsVi = docso;
export const numberToWordsViWithUnit = docsocodonvi;
