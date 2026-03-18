import { ValidationError } from "@/core/errors/app-error";

import { loadDocxZip, XML_PARTS_RE, W_PARAGRAPH_RE } from "./auto-tagging-docx-parser";
import type { TagFormat } from "./auto-tagging-types";

// ---------------------------------------------------------------------------
// Public: replace text with tags and produce new template
// ---------------------------------------------------------------------------

function wrapTag(header: string, format: TagFormat): string {
  return format === "curly" ? `{{${header}}}` : `[${header}]`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build a map of concatenated paragraph text -> paragraph XML for each <w:p>.
 * This lets us find which paragraph contains the matched text, then do a
 * safe replacement only within <w:t> tags of that paragraph.
 */
function replaceParagraphText(
  paragraphXml: string,
  matchedText: string,
  replacement: string,
): string | null {
  const textParts: Array<{
    full: string;
    text: string;
    start: number;
    end: number;
    textStart: number;
    textEnd: number;
  }> = [];
  const tRe = /<w:t(?=[\s>])[^>]*>([\s\S]*?)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = tRe.exec(paragraphXml)) !== null) {
    const full = m[0];
    const text = m[1] ?? "";
    const openEnd = full.indexOf(">") + 1;
    const textStart = m.index + openEnd;
    const textEnd = textStart + text.length;
    textParts.push({
      full,
      text,
      start: m.index,
      end: m.index + full.length,
      textStart,
      textEnd,
    });
  }
  if (textParts.length === 0) return null;

  const concatenated = textParts.map((p) => p.text).join("");
  const matchStart = concatenated.indexOf(matchedText);
  if (matchStart < 0) return null;
  const matchEnd = matchStart + matchedText.length;
  const escapedReplacement = escapeXml(replacement);

  const runRanges: Array<{ start: number; end: number }> = [];
  let globalOffset = 0;
  for (const part of textParts) {
    const start = globalOffset;
    const end = start + part.text.length;
    runRanges.push({ start, end });
    globalOffset = end;
  }

  // Rebuild paragraph from exact node offsets; avoid string replace collisions.
  let result = "";
  let cursor = 0;
  let inserted = false;

  for (let i = 0; i < textParts.length; i++) {
    const part = textParts[i];
    const range = runRanges[i];

    result += paragraphXml.slice(cursor, part.start);

    const intersects = matchStart < range.end && matchEnd > range.start;
    if (!intersects) {
      result += part.full;
      cursor = part.end;
      continue;
    }

    const startInRun = Math.max(0, matchStart - range.start);
    const endInRun = Math.min(part.text.length, matchEnd - range.start);
    const before = part.text.slice(0, startInRun);
    const after = part.text.slice(endInRun);
    const middle = inserted ? "" : escapedReplacement;
    inserted = true;

    result += `<w:t xml:space="preserve">${before}${middle}${after}</w:t>`;
    cursor = part.end;
  }

  result += paragraphXml.slice(cursor);
  return result;
}

export async function replaceWithTags(
  docxBuffer: Buffer,
  accepted: Array<{ header: string; matchedText: string }>,
  format: TagFormat,
): Promise<Buffer> {
  if (accepted.length === 0) throw new ValidationError("Không có tag nào được chọn.");
  const zip = await loadDocxZip(docxBuffer);

  const xmlParts = Object.keys(zip.files).filter((name) => XML_PARTS_RE.test(name));

  for (const xmlPath of xmlParts) {
    const xml = await zip.file(xmlPath)?.async("string");
    if (!xml) continue;

    // Process paragraph-by-paragraph to avoid corrupting XML structure
    let resultXml = xml;
    let modified = false;

    for (const { header, matchedText } of accepted) {
      const tag = wrapTag(header, format);
      const paragraphs = [...resultXml.matchAll(W_PARAGRAPH_RE)];

      for (const paraMatch of paragraphs) {
        const paraXml = paraMatch[0];
        const replaced = replaceParagraphText(paraXml, matchedText, tag);
        if (replaced && replaced !== paraXml) {
          resultXml = resultXml.replace(paraXml, replaced);
          modified = true;
          break; // only replace first occurrence
        }
      }
    }

    if (modified) {
      zip.file(xmlPath, resultXml);
    }
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return Buffer.from(buffer);
}
