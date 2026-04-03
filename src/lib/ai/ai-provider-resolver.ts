/**
 * Shared AI provider resolution logic.
 * Determines which AI provider (OpenAI / Gemini) to use based on env config.
 * Single source of truth — all services import from here.
 */

export type AiProviderName = "openai" | "gemini";

export type ResolvedAiProvider = {
  provider: AiProviderName;
  apiKey: string;
  model: string;
};

/**
 * Resolve which AI provider to use based on environment variables.
 *
 * Priority:
 * 1. Explicit AI_MAPPING_PROVIDER env var
 * 2. Fallback: whichever API key is available (OpenAI first)
 *
 * @throws {Error} if no provider is configured
 */
export function resolveAiProvider(opts?: {
  defaultOpenAiModel?: string;
  defaultGeminiModel?: string;
}): ResolvedAiProvider {
  const defaultOpenAiModel = opts?.defaultOpenAiModel ?? "gpt-4o-mini";
  const defaultGeminiModel = opts?.defaultGeminiModel ?? "gemini-1.5-flash";

  const explicit = (process.env.AI_MAPPING_PROVIDER ?? "").toLowerCase();

  if (explicit === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
    return { provider: "openai", apiKey, model: process.env.OPENAI_MODEL ?? defaultOpenAiModel };
  }

  if (explicit === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY/GOOGLE_API_KEY is not configured.");
    return { provider: "gemini", apiKey, model: process.env.GEMINI_MODEL ?? defaultGeminiModel };
  }

  // Fallback: auto-detect from available keys
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL ?? defaultOpenAiModel,
    };
  }

  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    return {
      provider: "gemini",
      apiKey: (process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY)!,
      model: process.env.GEMINI_MODEL ?? defaultGeminiModel,
    };
  }

  throw new Error("No AI provider configured. Set OPENAI_API_KEY or GEMINI_API_KEY.");
}
