/**
 * Convert a number to Vietnamese words (e.g., 260000000 → "Hai trăm sáu mươi triệu đồng")
 * Handles up to hàng tỷ (billions). Appends "đồng" suffix by default.
 */

const DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function readThreeDigits(h: number, t: number, u: number, hasHigherGroup: boolean): string {
  const parts: string[] = [];

  if (h > 0) {
    parts.push(`${DIGITS[h]} trăm`);
    if (t === 0 && u > 0) parts.push("lẻ");
  } else if (hasHigherGroup && (t > 0 || u > 0)) {
    parts.push("không trăm");
  }

  if (t > 1) {
    parts.push(`${DIGITS[t]} mươi`);
    if (u === 1) parts.push("mốt");
    else if (u === 4) parts.push("tư");
    else if (u === 5) parts.push("lăm");
    else if (u > 0) parts.push(DIGITS[u]);
  } else if (t === 1) {
    parts.push("mười");
    if (u === 5) parts.push("lăm");
    else if (u > 0) parts.push(DIGITS[u]);
  } else if (u > 0) {
    // t === 0
    if (h > 0 || hasHigherGroup) {
      // "lẻ" already added above when h > 0
      parts.push(DIGITS[u]);
    } else {
      parts.push(DIGITS[u]);
    }
  }

  return parts.join(" ");
}

const GROUPS = ["", "nghìn", "triệu", "tỷ"];

export function numberToVietnameseWords(n: number, suffix = "đồng"): string {
  if (!Number.isFinite(n) || n < 0) return "";
  const integer = Math.floor(n);
  if (integer === 0) return suffix ? `Không ${suffix}` : "Không";

  // Split into groups of 3 digits from right
  const groups: number[] = [];
  let remaining = integer;
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const words: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    const h = Math.floor(g / 100);
    const t = Math.floor((g % 100) / 10);
    const u = g % 10;
    const hasHigher = i < groups.length - 1;
    const text = readThreeDigits(h, t, u, hasHigher);
    if (text) {
      // For tỷ, handle multiple tỷ levels (nghìn tỷ, triệu tỷ)
      let groupName = "";
      if (i >= 4) {
        // e.g., i=4 → nghìn tỷ, i=5 → triệu tỷ
        groupName = `${GROUPS[i - 3]} tỷ`.trim();
      } else {
        groupName = GROUPS[i];
      }
      words.push(groupName ? `${text} ${groupName}` : text);
    }
  }

  let result = words.join(" ").replace(/\s+/g, " ").trim();

  // Handle decimal part: 231.94 → "phẩy chín mươi bốn"
  const decStr = String(n).replace(/,/g, ".");
  const dotIdx = decStr.indexOf(".");
  if (dotIdx >= 0) {
    const decPart = decStr.slice(dotIdx + 1).replace(/0+$/, ""); // trim trailing zeros
    if (decPart.length > 0) {
      const decNum = parseInt(decPart, 10);
      if (decNum > 0) {
        const decWords = numberToVietnameseWords(decNum, "").toLowerCase();
        result += ` phẩy ${decWords}`;
      }
    }
  }

  // Capitalize first letter
  const capitalized = result.charAt(0).toUpperCase() + result.slice(1);
  return suffix ? `${capitalized} ${suffix}` : capitalized;
}
