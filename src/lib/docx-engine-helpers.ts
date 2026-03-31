// Private helper functions for the DOCX engine

import fs from "node:fs/promises";
import path from "node:path";

import type { AliasSpec, AliasMap, FlatTemplateData, DocxTemplateData } from "./docx-engine-types";

export function normalizeRelPath(relPath: string): string {
  return relPath.replaceAll("\\", "/");
}

export function resolveWorkspacePath(relPath: string): string {
  // If relPath is already absolute, return it as-is (converted to native path separators)
  if (path.isAbsolute(relPath)) {
    return relPath;
  }
  // Otherwise, join with process.cwd()
  return path.join(process.cwd(), normalizeRelPath(relPath));
}

export function toTodayLiteral(value: unknown): unknown {
  if (value === "$TODAY_DDMMYYYY") return new Date().toLocaleDateString("vi-VN");
  if (value === "$TODAY_DD") return String(new Date().getDate()).padStart(2, "0");
  if (value === "$TODAY_MM") return String(new Date().getMonth() + 1).padStart(2, "0");
  if (value === "$TODAY_YYYY") return String(new Date().getFullYear());
  return value;
}

export function resolveAlias(flatData: Record<string, unknown>, aliasSpec: AliasSpec): unknown {
  if (typeof aliasSpec === "string") return flatData[aliasSpec];
  if (Array.isArray(aliasSpec)) {
    for (const key of aliasSpec) {
      if (typeof key === "string" && key in flatData) return flatData[key];
    }
    return undefined;
  }
  if (aliasSpec && typeof aliasSpec === "object") {
    if ("literal" in aliasSpec) return toTodayLiteral(aliasSpec.literal);
    if ("from" in aliasSpec) {
      const from = aliasSpec.from;
      if (typeof from === "string") return flatData[from];
      if (Array.isArray(from)) {
        for (const key of from) {
          if (typeof key === "string" && key in flatData) return flatData[key];
        }
      }
    }
  }
  return undefined;
}

export function applyAliasMap(flatData: Record<string, unknown>, aliasMap: Record<string, AliasSpec>): Record<string, unknown> {
  const merged = { ...flatData };
  for (const [field, spec] of Object.entries(aliasMap)) {
    if (field in merged) continue;
    const value = resolveAlias(merged, spec);
    if (value !== undefined) merged[field] = value;
  }
  return merged;
}

export function formatScalar(value: unknown): unknown {
  if (typeof value === "number" && Number.isFinite(value)) {
    let s = value.toLocaleString("en-US", { maximumFractionDigits: 6 });
    s = s.replace(/,/g, "_").replace(/\./g, ",").replace(/_/g, ".");
    return s;
  }
  return value;
}

export function deepFormat(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => deepFormat(item));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepFormat(v);
    }
    return out;
  }
  return formatScalar(value);
}

// Tạm bỏ hàm unflatten vì gây lỗi map key có chứa dấu "." của docxtemplater

export function toEngineData<TFlat extends FlatTemplateData>(data: DocxTemplateData<TFlat>): Record<string, unknown> {
  if (data && typeof data === "object" && "flat" in data) {
    const flat = (data.flat ?? {}) as Record<string, unknown>;
    const aliasMap = (data.aliasMap ?? {}) as AliasMap;
    // Bỏ gọi hàm unflatten vì docxtemplater mặc định KHÔNG hỗ trợ phân giải nested object (nếu k dùng angularParser),
    // do đó các tag dạng thẻ [custom.abc.xyz] sẽ map trực tiếp với key "custom.abc.xyz" ở dạng flat data root.
    return deepFormat(applyAliasMap(flat, aliasMap)) as Record<string, unknown>;
  }
  if (data && typeof data === "object") {
    return deepFormat(data) as Record<string, unknown>;
  }
  return {};
}

export function tsForFilename(date = new Date()): string {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function pruneOldBackups(dirPath: string, keepLatest = 50): Promise<void> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".docx"))
    .map((e) => e.name)
    .sort();
  if (files.length <= keepLatest) return;
  const toDelete = files.slice(0, files.length - keepLatest);
  await Promise.all(toDelete.map((file) => fs.unlink(path.join(dirPath, file)).catch(() => undefined)));
}

/**
 * Merge adjacent <w:r> runs with identical <w:rPr> formatting in OOXML.
 * Word often splits placeholder text (especially Vietnamese Đ/đ) across
 * multiple runs, breaking docxtemplater tag detection. This pre-processing
 * step concatenates text of consecutive runs that share the same formatting.
 */
export function mergeAdjacentRuns(xml: string): string {
  // Fix split placeholders: Word splits [placeholder] across multiple <w:r> runs.
  // Process each paragraph independently — collect <w:t> texts, find unclosed [,
  // merge text into the first <w:t> and empty subsequent ones until ] is found.

  return xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (paragraph) => {
    // Quick check: does this paragraph have any [ at all?
    const textContent = paragraph.replace(/<[^>]+>/g, "");
    if (!textContent.includes("[")) return paragraph;

    // Collect all <w:t> nodes with their positions within the paragraph
    type TNode = { start: number; end: number; text: string; tag: string };
    const tRegex = /(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g;
    const nodes: TNode[] = [];
    let m: RegExpExecArray | null;
    while ((m = tRegex.exec(paragraph)) !== null) {
      nodes.push({ start: m.index, end: m.index + m[0].length, text: m[2], tag: m[1] });
    }

    if (nodes.length < 2) return paragraph;

    // Find split placeholders and merge
    const textMods = nodes.map((n) => ({ ...n, newText: n.text }));
    for (let i = 0; i < textMods.length; i++) {
      const cur = textMods[i].newText;
      // Count unclosed [ in this node
      let depth = 0;
      for (const ch of cur) {
        if (ch === "[") depth++;
        else if (ch === "]") depth--;
      }
      if (depth <= 0) continue;

      // Merge subsequent nodes until all [ are closed
      for (let j = i + 1; j < textMods.length && depth > 0; j++) {
        textMods[i].newText += textMods[j].newText;
        textMods[j].newText = "";
        for (const ch of nodes[j].text) {
          if (ch === "[") depth++;
          else if (ch === "]") depth--;
        }
      }
    }

    // Check if any changes were made
    const changed = textMods.some((n, idx) => n.newText !== nodes[idx].text);
    if (!changed) return paragraph;

    // Rebuild paragraph with modified text
    let result = "";
    let pos = 0;
    for (let i = 0; i < nodes.length; i++) {
      result += paragraph.substring(pos, nodes[i].start);
      const needSpace = textMods[i].newText.includes(" ");
      const tOpen = needSpace ? '<w:t xml:space="preserve">' : nodes[i].tag;
      result += `${tOpen}${textMods[i].newText}</w:t>`;
      pos = nodes[i].end;
    }
    result += paragraph.substring(pos);
    return result;
  });
}

/**
 * Post-render cleanup on document.xml inside a PizZip docx archive.
 * - Converts self-closing `<w:p/>` to valid empty paragraphs
 * - Removes orphaned table rows left by loop tag removal:
 *   a) rows with NO cells at all
 *   b) rows with cells but ZERO visible text (loop marker residue)
 *      — keeps vMerge rows (intentional header/layout spacers)
 *      — keeps rows with explicit trHeight (intentional blank form areas)
 *      — skips rows containing nested tables (regex boundary safety)
 * - Ensures every `<w:tc>` has at least one `<w:p>` (OOXML requirement)
 */
export function cleanupRenderedDocXml(zip: import("pizzip")): void {
  const docXml = zip.file("word/document.xml");
  if (!docXml) return;
  let xmlStr = docXml.asText();
  // Convert self-closing <w:p/> to valid empty paragraph (keeps table cells valid)
  xmlStr = xmlStr.replace(/<w:p\/>/g, "<w:p></w:p>");
  // Remove empty table rows left behind after loop marker removal.
  // Docxtemplater with paragraphLoop removes the marker TEXT ([#loop]/[/loop])
  // but leaves the table rows intact (empty cells).
  xmlStr = xmlStr.replace(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g, (row) => {
    // Guard: skip rows containing nested tables — regex may mismatch across boundaries
    if (/<w:tbl[\s>]/.test(row)) return row;
    const hasCells = /<w:tc[\s>]/.test(row);
    if (!hasCells) return "";
    // Keep merged-cell rows (intentional header/layout spacers)
    if (/<w:vMerge/.test(row)) return row;
    // Keep rows with explicit FIXED height — intentional blank form areas (e.g. "For bank use only").
    // Only preserve w:hRule="exact" rows; Word auto-assigns trHeight to loop-residue rows
    // which should still be cleaned up.
    if (/<w:trHeight[^>]*w:hRule="exact"/.test(row)) return row;
    // Remove rows where all cells are empty text (loop marker residue)
    const visibleText = row.replace(/<[^>]+>/g, "").trim();
    return visibleText === "" ? "" : row;
  });
  // Ensure every table cell has at least one paragraph (OOXML spec requirement).
  // Docxtemplater's paragraphLoop can strip all <w:p> from a cell, leaving it
  // invalid for viewers like ProseMirror.
  xmlStr = xmlStr.replace(/<\/w:tcPr>([\s]*)<\/w:tc>/g, "</w:tcPr>$1<w:p></w:p></w:tc>");
  zip.file("word/document.xml", xmlStr);
}

export function isSafeDocxPath(relPath: string): boolean {
  const normalized = normalizeRelPath(relPath);
  if (!normalized.startsWith("report_assets/")) return false;
  if (normalized.includes("..")) return false;
  return normalized.toLowerCase().endsWith(".docx");
}
