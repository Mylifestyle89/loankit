import { ValidationError } from "@/core/errors/app-error";

export type DynamicRow = Record<string, unknown>;

export type RootKeyCandidate = {
  key: string;
  uniqueRatio: number;
  nonEmptyRatio: number;
  score: number;
};

export type RootKeyResolution = {
  rootKey: string;
  candidates: RootKeyCandidate[];
  source: "user" | "ai" | "heuristic";
};

function normalizeKey(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeCellValue(value: unknown): unknown {
  if (value instanceof Date) return value.toLocaleDateString("vi-VN");
  if (typeof value === "string") return value.trim();
  return value;
}

export function normalizeDynamicRows<T extends DynamicRow>(rows: T[]): T[] {
  if (!Array.isArray(rows)) throw new ValidationError("rows must be an array.");
  return rows
    .filter((row) => Boolean(row && typeof row === "object" && !Array.isArray(row)))
    .map((row) => {
      const next: DynamicRow = {};
      for (const [k, v] of Object.entries(row)) {
        next[k] = normalizeCellValue(v);
      }
      return next as T;
    });
}

export function rankRootKeyCandidates<T extends DynamicRow>(rows: T[], headers: string[]): RootKeyCandidate[] {
  if (!Array.isArray(headers) || headers.length === 0) return [];
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const total = rows.length;
  const results: RootKeyCandidate[] = [];
  for (const header of headers) {
    const key = normalizeKey(header);
    if (!key) continue;

    const nonEmptyValues = rows
      .map((row) => normalizeKey(row[key]))
      .filter(Boolean);

    if (nonEmptyValues.length === 0) {
      continue;
    }

    const uniqueCount = new Set(nonEmptyValues).size;
    const uniqueRatio = uniqueCount / nonEmptyValues.length;
    const nonEmptyRatio = nonEmptyValues.length / total;
    const score = uniqueRatio * 0.75 + nonEmptyRatio * 0.25;
    results.push({ key, uniqueRatio, nonEmptyRatio, score });
  }

  return results.sort((a, b) => b.score - a.score || b.uniqueRatio - a.uniqueRatio || a.key.localeCompare(b.key, "vi"));
}

export function resolveRootKey<T extends DynamicRow>(params: {
  rows: T[];
  headers: string[];
  aiSuggestedKey?: string;
  userSelectedKey?: string;
}): RootKeyResolution {
  const rows = normalizeDynamicRows(params.rows);
  const headers = [...new Set(params.headers.map((h) => normalizeKey(h)).filter(Boolean))];
  if (headers.length === 0) throw new ValidationError("Không tìm thấy header hợp lệ trong file Excel.");
  if (rows.length === 0) throw new ValidationError("Không có dòng dữ liệu hợp lệ trong file Excel.");

  const candidates = rankRootKeyCandidates(rows, headers);
  if (candidates.length === 0) throw new ValidationError("Không thể xác định khóa chính từ dữ liệu.");

  const userKey = normalizeKey(params.userSelectedKey);
  if (userKey) {
    if (!headers.includes(userKey)) {
      throw new ValidationError(`Khóa chính '${userKey}' không tồn tại trong danh sách header.`);
    }
    return { rootKey: userKey, candidates, source: "user" };
  }

  const aiKey = normalizeKey(params.aiSuggestedKey);
  if (aiKey && headers.includes(aiKey)) {
    return { rootKey: aiKey, candidates, source: "ai" };
  }

  return { rootKey: candidates[0].key, candidates, source: "heuristic" };
}

export function mapRowsWithSuggestion<T extends DynamicRow>(rows: T[], mapping: Record<string, string>): Array<T & DynamicRow> {
  const normalizedRows = normalizeDynamicRows(rows);
  if (!mapping || typeof mapping !== "object") return normalizedRows as Array<T & DynamicRow>;

  return normalizedRows.map((row) => {
    const mapped: DynamicRow = { ...row };
    for (const [placeholder, header] of Object.entries(mapping)) {
      const placeholderKey = normalizeKey(placeholder);
      const sourceKey = normalizeKey(header);
      if (!placeholderKey || !sourceKey) continue;
      mapped[placeholderKey] = row[sourceKey];
    }
    return mapped as T & DynamicRow;
  });
}

export function pickBestCustomerNameKey(headers: string[], mapping: Record<string, string>): string | undefined {
  const normalizedHeaders = headers.map((h) => normalizeKey(h)).filter(Boolean);
  const mappedHeaders = Object.entries(mapping)
    .filter(([placeholder]) => /ten|name|customer/i.test(placeholder))
    .map(([, header]) => normalizeKey(header))
    .filter(Boolean);

  if (mappedHeaders.length > 0) return mappedHeaders[0];

  const fallback = normalizedHeaders.find((header) => /ten|name|customer|khach hang/i.test(header));
  return fallback;
}
