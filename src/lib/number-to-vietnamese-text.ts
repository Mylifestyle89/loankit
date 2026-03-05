/**
 * Convert a number to Vietnamese text representation for currency.
 * Example: 1500000 → "Một triệu năm trăm nghìn đồng"
 */

const DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function readGroup(hundreds: number, tens: number, ones: number, showZeroHundreds: boolean): string {
  const parts: string[] = [];

  if (hundreds > 0) {
    parts.push(`${DIGITS[hundreds]} trăm`);
  } else if (showZeroHundreds) {
    parts.push("không trăm");
  }

  if (tens > 1) {
    parts.push(`${DIGITS[tens]} mươi`);
    if (ones === 1) parts.push("mốt");
    else if (ones === 4) parts.push("tư");
    else if (ones === 5) parts.push("lăm");
    else if (ones > 0) parts.push(DIGITS[ones]);
  } else if (tens === 1) {
    parts.push("mười");
    if (ones === 5) parts.push("lăm");
    else if (ones > 0) parts.push(DIGITS[ones]);
  } else if (ones > 0) {
    if (hundreds > 0 || showZeroHundreds) parts.push("lẻ");
    parts.push(DIGITS[ones]);
  }

  return parts.join(" ");
}

const UNITS = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

export function numberToVietnameseText(n: number): string {
  if (n === 0) return "Không đồng";
  if (!Number.isFinite(n)) return "";

  let prefix = "";
  if (n < 0) {
    prefix = "Âm ";
    n = Math.abs(n);
  }

  // Round to integer (currency = whole VND)
  n = Math.round(n);

  // Split into 3-digit groups from right
  const groups: number[] = [];
  let remaining = n;
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const textParts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    if (group === 0) continue;

    const hundreds = Math.floor(group / 100);
    const tens = Math.floor((group % 100) / 10);
    const ones = group % 10;

    // Show "không trăm" if this is not the highest group and has tens/ones
    const showZeroHundreds = i < groups.length - 1 && hundreds === 0 && (tens > 0 || ones > 0);

    const groupText = readGroup(hundreds, tens, ones, showZeroHundreds);
    if (groupText) {
      textParts.push(UNITS[i] ? `${groupText} ${UNITS[i]}` : groupText);
    }
  }

  const result = textParts.join(" ");
  // Capitalize first letter
  const capitalized = prefix + result.charAt(0).toUpperCase() + result.slice(1);
  return `${capitalized} đồng`;
}
