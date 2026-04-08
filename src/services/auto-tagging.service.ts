import fs from "node:fs/promises";
import path from "node:path";

import { signFileAccess } from "@/lib/report/file-token";

// ---------------------------------------------------------------------------
// Re-exports for backward compatibility
// ---------------------------------------------------------------------------

export type { DocxParagraph, TagSuggestion, ReverseSuggestionResult, TagFormat } from "./auto-tagging-types";
export { extractParagraphs } from "./auto-tagging-docx-parser";
export {
  callAI,
  sanitizeSuggestions,
  buildAutoTagPrompt,
  fuzzyFallback,
} from "./auto-tagging-ai-helpers";
import { extractJsonFromAiResponse } from "@/lib/ai";
import { normalizeText } from "@/lib/text/normalize";
export { analyzeDocument, reverseEngineerTemplate } from "./auto-tagging-analysis";
export { replaceWithTags } from "./auto-tagging-replace";

// ---------------------------------------------------------------------------
// Public: save template to disk
// ---------------------------------------------------------------------------

export async function saveTemplate(
  templateBuffer: Buffer,
  outputName: string | undefined,
  sessionId: string,
): Promise<{ templatePath: string; downloadUrl: string }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
  const dirName = `AutoTagging_${timestamp}`;
  const dir = path.join(process.cwd(), "report_assets", "exports", dirName);
  await fs.mkdir(dir, { recursive: true });

  const fileName = outputName?.trim()
    ? outputName.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    : `tagged-template_${timestamp}.docx`;
  const filePath = path.join(dir, fileName);
  await fs.writeFile(filePath, templateBuffer);

  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return {
    templatePath: relPath,
    downloadUrl: `/api/report/file?path=${encodeURIComponent(relPath)}&download=1&token=${encodeURIComponent(signFileAccess(relPath, sessionId))}`,
  };
}
