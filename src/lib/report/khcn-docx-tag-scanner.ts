/**
 * DOCX Tag Scanner — extracts [placeholder] tags from DOCX template files.
 * Used by the validation layer to cross-check templates against placeholder registry.
 */
import fs from "node:fs";
import path from "node:path";
import PizZip from "pizzip";
import { mergeAdjacentRuns } from "../docx-engine-helpers";

export type DocxTagScanResult = {
  filePath: string;
  /** Regular placeholder tags (without brackets) */
  tags: Set<string>;
  /** Loop open names: [#LOOP] → "LOOP" */
  loopOpens: Set<string>;
  /** Loop close names: [/LOOP] → "LOOP" */
  loopCloses: Set<string>;
  /** Parse errors encountered */
  errors: string[];
};

/** XML parts inside DOCX that may contain placeholder tags */
const XML_PARTS = [
  "word/document.xml",
  "word/header1.xml",
  "word/header2.xml",
  "word/footer1.xml",
  "word/footer2.xml",
];

/**
 * Scan a single DOCX file and extract all [placeholder] tags.
 * Handles split tags via mergeAdjacentRuns (same as docx-engine).
 */
export function scanDocxTags(relPath: string): DocxTagScanResult {
  const result: DocxTagScanResult = {
    filePath: relPath,
    tags: new Set(),
    loopOpens: new Set(),
    loopCloses: new Set(),
    errors: [],
  };

  const absPath = path.isAbsolute(relPath) ? relPath : path.join(process.cwd(), relPath);
  if (!fs.existsSync(absPath)) {
    result.errors.push(`File not found: ${relPath}`);
    return result;
  }

  let zip: PizZip;
  try {
    zip = new PizZip(fs.readFileSync(absPath));
  } catch (e) {
    result.errors.push(`Cannot open DOCX: ${(e as Error).message}`);
    return result;
  }

  for (const xmlFile of XML_PARTS) {
    const entry = zip.file(xmlFile);
    if (!entry) continue;

    // Merge split XML runs (same pre-processing as docx-engine)
    const xml = mergeAdjacentRuns(entry.asText());

    // Strip XML tags to get plain text, then extract [TAG] patterns
    const plainText = xml.replace(/<[^>]+>/g, "");
    const tagRegex = /\[([^\[\]]+)\]/g;
    let match: RegExpExecArray | null;
    while ((match = tagRegex.exec(plainText)) !== null) {
      const tag = match[1].trim();
      if (tag.startsWith("#")) {
        result.loopOpens.add(tag.slice(1));
      } else if (tag.startsWith("/")) {
        result.loopCloses.add(tag.slice(1));
      } else {
        result.tags.add(tag);
      }
    }
  }

  return result;
}

/**
 * Normalize indexed tag to base form: "SĐ_1.Tên TSBĐ" → "SĐ.Tên TSBĐ"
 * Handles Vietnamese prefixes: SĐ, ĐS, ĐSH, etc.
 */
export function normalizeIndexedTag(tag: string): string {
  return tag.replace(/^([A-ZĐa-zđ]+)_\d+\./, "$1.");
}

/**
 * Scan all DOCX templates from the KHCN registries.
 * Returns Map<filePath, DocxTagScanResult>.
 */
export function scanAllKhcnTemplates(
  templates: Array<{ path: string }>,
): Map<string, DocxTagScanResult> {
  const results = new Map<string, DocxTagScanResult>();
  // Deduplicate paths (same file may appear in both registries)
  const uniquePaths = [...new Set(templates.map((t) => t.path))];
  for (const tplPath of uniquePaths) {
    results.set(tplPath, scanDocxTags(tplPath));
  }
  return results;
}
