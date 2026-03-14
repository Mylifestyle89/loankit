/**
 * DOCX Section Cloner — clones body content N times with indexed prefixes.
 * Used to render multiple collaterals of same type in one DOCX output.
 *
 * Given a template with [SĐ.Tên TSBĐ], calling with prefix="SĐ" and count=3
 * produces 3 copies of the body with [SĐ_1.Tên TSBĐ], [SĐ_2.Tên TSBĐ], [SĐ_3.Tên TSBĐ].
 */
import type PizZip from "pizzip";

/**
 * Clone body content of word/document.xml N times, rewriting prefixed placeholders.
 * - Preserves <w:sectPr> (page layout) — only one copy at end
 * - Handles prefix split across XML runs via XML-tag-aware regex
 * - count=1 → rewrites SĐ. → SĐ_1. (consistent indexed format)
 * - count=0 → no-op
 */
export function cloneSectionsForAssets(zip: PizZip, prefix: string, count: number): void {
  if (count <= 0) return;

  const docFile = zip.file("word/document.xml");
  if (!docFile) return;

  const xml = docFile.asText();

  // Locate <w:body> content boundaries
  const bodyOpenMatch = xml.match(/<w:body[^>]*>/);
  if (!bodyOpenMatch) return;
  const bodyStart = bodyOpenMatch.index! + bodyOpenMatch[0].length;
  const bodyCloseIdx = xml.lastIndexOf("</w:body>");
  if (bodyCloseIdx < 0) return;

  // Extract body inner content and separate final <w:sectPr>
  const bodyInner = xml.substring(bodyStart, bodyCloseIdx);
  const sectPrMatch = bodyInner.match(/<w:sectPr\b[\s\S]*<\/w:sectPr>\s*$/);
  const contentWithoutSectPr = sectPrMatch
    ? bodyInner.substring(0, sectPrMatch.index!)
    : bodyInner;
  const sectPr = sectPrMatch ? sectPrMatch[0] : "";

  // Build XML-tag-aware regex for prefix replacement.
  // Handles cases where prefix is split across runs:
  // e.g., "SĐ" in one <w:t> and ".Tên" in another
  // Pattern: match each char of prefix with optional XML tags between them,
  // followed by optional XML tags then "."
  const escapedPrefix = escapeRegex(prefix);
  // Build pattern that matches prefix chars with optional XML tags between,
  // followed by (optional XML tags) then literal dot.
  // Anchored after "[" (or XML tags after "[") to avoid replacing prose text.
  const charPattern = escapedPrefix.split("").join("(?:<[^>]*>)*");
  const fullPattern = new RegExp(`(?<=\\[(?:<[^>]*>)*)(${charPattern})((?:<[^>]*>)*)(\\.)`, "g");

  // Clone body content N times with indexed prefixes
  const clonedSections: string[] = [];
  for (let i = 1; i <= count; i++) {
    const indexed = contentWithoutSectPr.replace(fullPattern, (_, pre, xmlTags, dot) => {
      // Rewrite prefix to indexed form, preserving any XML tags
      return rewritePrefixChars(pre, prefix, `${prefix}_${i}`) + xmlTags + dot;
    });
    clonedSections.push(indexed);
  }

  // Also rewrite ĐSH. prefix (owner fields) if present — they get same index
  const ownerPrefix = "ĐSH";
  const ownerCharPattern = escapeRegex(ownerPrefix).split("").join("(?:<[^>]*>)*");
  const ownerFullPattern = new RegExp(`(?<=\\[(?:<[^>]*>)*)(${ownerCharPattern})((?:<[^>]*>)*)(\\.)`, "g");

  const finalSections = clonedSections.map((section, idx) => {
    return section.replace(ownerFullPattern, (_, pre, xmlTags, dot) => {
      return rewritePrefixChars(pre, ownerPrefix, `${ownerPrefix}_${idx + 1}`) + xmlTags + dot;
    });
  });

  // Reassemble
  const newXml =
    xml.substring(0, bodyStart) +
    finalSections.join("") +
    sectPr +
    xml.substring(bodyCloseIdx);

  zip.file("word/document.xml", newXml);
}

/** Escape special regex characters */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Rewrite prefix characters that may be interspersed with XML tags.
 * E.g., matched "S<w:t>Đ" with original prefix "SĐ" → "S<w:t>Đ_1"
 * We replace the last char of the prefix with lastChar + "_N"
 */
function rewritePrefixChars(matched: string, originalPrefix: string, newPrefix: string): string {
  // Simple case: no XML tags in between
  if (matched === originalPrefix) return newPrefix;

  // Complex case: XML tags between prefix chars
  // Replace the original prefix text with new prefix, preserving XML tags
  const suffix = newPrefix.substring(originalPrefix.length); // e.g., "_1"
  // Find last actual text character position and append suffix after it
  let result = "";
  let prefixIdx = 0;
  for (let i = 0; i < matched.length; i++) {
    if (matched[i] === "<") {
      // Skip XML tag
      const tagEnd = matched.indexOf(">", i);
      result += matched.substring(i, tagEnd + 1);
      i = tagEnd;
    } else {
      result += matched[i];
      prefixIdx++;
      // After last prefix character, append the index suffix
      if (prefixIdx === originalPrefix.length) {
        result += suffix;
      }
    }
  }
  return result;
}

/** Map asset template category → collateral prefix for cloning */
export const CATEGORY_TO_PREFIX: Record<string, string> = {
  ts_qsd_bv: "SĐ",
  ts_qsd_bt3: "SĐ",
  ts_glvd_bv: "SĐ",
  ts_glvd_bt3: "SĐ",
  ts_ptgt_bv: "ĐS",
  ts_ptgt_bt3: "ĐS",
  // tai_san = common templates, no cloning needed
};

/** Map asset category → collateral_type for counting */
export const CATEGORY_TO_COLLATERAL_TYPE: Record<string, string> = {
  ts_qsd_bv: "qsd_dat",
  ts_qsd_bt3: "qsd_dat",
  ts_glvd_bv: "qsd_dat",
  ts_glvd_bt3: "qsd_dat",
  ts_ptgt_bv: "dong_san",
  ts_ptgt_bt3: "dong_san",
};
