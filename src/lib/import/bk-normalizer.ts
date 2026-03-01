// Data normalization rules for Vietnamese formatting
// Handles: placeholders, Vietnamese numbers, dates, empty values

export const BK_NORMALIZATION_RULES = {
  // Values to treat as empty/null
  placeholders: [
    /^\.{5,}$/,                              // 5+ dots
    /^\s*\.{3,}\s*$/,                        // dots with spaces
    "N/A",
    "",
    " ",
  ],

  // Date formats to handle
  datePatterns: {
    ddmmyyyy: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,  // dd/mm/yyyy or dd-mm-yyyy
  },

  // Vietnamese number format: "219.000.000" = 219 million
  vietnameseNumberPattern: /^([\d.]+)(?:\s*(tỷ|triệu|nghìn))?$/i,
};

/**
 * Check if a value is empty/placeholder
 */
export function isEmptyValue(value: string | null | undefined): boolean {
  if (!value) return true;
  const trimmed = String(value).trim();
  if (trimmed === "") return true;

  for (const placeholder of BK_NORMALIZATION_RULES.placeholders) {
    if (typeof placeholder === 'string' && trimmed === placeholder) return true;
    if (placeholder instanceof RegExp && placeholder.test(trimmed)) return true;
  }
  return false;
}

/**
 * Convert Vietnamese number format to standard
 * "219.000.000" → "219000000"
 * "1.200.500 đồng" → "1200500"
 */
export function parseVietnameseNumber(value: string): string {
  if (isEmptyValue(value)) return "";

  let numStr = value.trim();

  // Remove unit suffixes
  numStr = numStr.replace(/\s*(tỷ|triệu|nghìn|đồng|VND)$/i, "");

  // Convert Vietnamese thousands separator (.) to nothing
  // "219.000.000" → "219000000"
  numStr = numStr.replace(/\./g, "");

  // Handle comma as decimal (rare but possible)
  numStr = numStr.replace(",", ".");

  return numStr;
}

/**
 * Parse Vietnamese date format (dd/mm/yyyy) → ISO (yyyy-mm-dd)
 * "07/08/2023" → "2023-08-07"
 */
export function parseVietnameseDate(value: string): string {
  if (isEmptyValue(value)) return "";

  const trimmed = value.trim();
  const match = BK_NORMALIZATION_RULES.datePatterns.ddmmyyyy.exec(trimmed);

  if (!match) return trimmed;  // Return as-is if doesn't match pattern

  const [, day, month, year] = match;
  const d = parseInt(day, 10).toString().padStart(2, "0");
  const m = parseInt(month, 10).toString().padStart(2, "0");

  return `${year}-${m}-${d}`;
}

/**
 * Extract first valid date from multi-line or complex value
 * "Ngày 07/08/2023\nNơi cấp: Hà Nội" → "2023-08-07"
 */
export function extractFirstDate(value: string): string {
  if (isEmptyValue(value)) return "";

  const lines = value.split(/[\n\r]+/);
  for (const line of lines) {
    const match = BK_NORMALIZATION_RULES.datePatterns.ddmmyyyy.exec(line);
    if (match) {
      return parseVietnameseDate(line);
    }
  }
  return "";
}

/**
 * Main normalizer: route values to appropriate cleaners based on field type
 */
export function normalizeAttributeValue(
  value: string | null | undefined,
  fieldKey: string  // e.g. "A.general.customer_name"
): string {
  if (isEmptyValue(value)) return "";

  // Date fields
  if (
    fieldKey.includes("date") ||
    fieldKey.includes("ngày") ||
    fieldKey.includes("_date")
  ) {
    return parseVietnameseDate(value!);
  }

  // Number fields (capital, assets, debt, outstanding, loan, etc.)
  if (
    fieldKey.includes("capital") ||
    fieldKey.includes("assets") ||
    fieldKey.includes("equity") ||
    fieldKey.includes("amount") ||
    fieldKey.includes("outstanding") ||
    fieldKey.includes("loan") ||
    fieldKey.includes("rate") ||
    fieldKey.includes("interest") ||
    fieldKey.includes("vốn") ||
    fieldKey.includes("tài sản") ||
    fieldKey.includes("nợ")
  ) {
    // Check if value looks like a number (contains digits and dots)
    if (/[\d.]+/.test(value!)) {
      return parseVietnameseNumber(value!);
    }
  }

  // Default: trim and return
  return value!.trim();
}
