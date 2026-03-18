/**
 * financial-analysis-types.ts
 *
 * Shared types for the financial analysis service.
 */

// ─── Public Types ─────────────────────────────────────────────────────────────

export type AnalysisField = {
  field_key: string;
  analysis_prompt: string;
};

export type AnalysisInput = {
  bctcData: import("@/lib/bctc-extractor").BctcExtractResult;
  fields: AnalysisField[];
  /** Optional user-provided qualitative info AI cannot derive from numbers. */
  qualitativeContext?: Record<string, string>;
  /** Override the default system prompt. */
  systemPromptOverride?: string;
};

export type AnalysisResult = {
  values: Record<string, string>;
  model: string;
  provider: "gemini" | "openai";
};
