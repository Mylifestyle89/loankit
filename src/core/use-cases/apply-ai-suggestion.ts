type MappingEntry = {
  template_field?: string;
  sources?: Array<{ source: string; path: string; note?: string }>;
  [key: string]: unknown;
};

type MappingJson = {
  mappings?: MappingEntry[];
  [key: string]: unknown;
};

export type ApplyAiSuggestionPayload = {
  suggestion: Record<string, string>;
  grouping?: { groupKey: string; repeatKey: string };
};

export type ApplyAiSuggestionResult = {
  nextMappingText: string;
  matched: number;
};

/**
 * Pure function: áp dụng AI suggestion vào mappingText JSON.
 * Không phụ thuộc React/UI — có thể unit test độc lập.
 * @throws SyntaxError nếu mappingText không phải JSON hợp lệ
 */
export function applyAiSuggestion(
  mappingText: string,
  payload: ApplyAiSuggestionPayload,
): ApplyAiSuggestionResult {
  const parsed = JSON.parse(mappingText) as MappingJson;
  let matched = 0;

  const nextMappings = (parsed.mappings ?? []).map((item) => {
    const key = typeof item.template_field === "string" ? item.template_field.trim() : "";
    const header = key ? payload.suggestion[key] : undefined;
    if (!header) return item;
    matched += 1;
    return {
      ...item,
      sources: [{ source: "excel_ai", path: header, note: "AI suggestion accepted" }],
    };
  });

  const nextMappingText = JSON.stringify(
    { ...parsed, mappings: nextMappings },
    null,
    2,
  );

  return { nextMappingText, matched };
}
