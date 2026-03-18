import JSZip from "jszip";

import { ValidationError } from "@/core/errors/app-error";

import type { DocxParagraph } from "./auto-tagging-types";

// ---------------------------------------------------------------------------
// DOCX text extraction (JSZip + XML regex)
// ---------------------------------------------------------------------------

const XML_PARTS_RE = /^word\/(document|header\d+|footer\d+)\.xml$/;
const W_PARAGRAPH_RE = /<w:p[ >][\s\S]*?<\/w:p>/g;
const W_TEXT_RE = /<w:t(?=[\s>])[^>]*>([\s\S]*?)<\/w:t>/g;

async function loadDocxZip(docxBuffer: Buffer): Promise<JSZip> {
  try {
    return await JSZip.loadAsync(docxBuffer);
  } catch {
    throw new ValidationError("File không phải DOCX hợp lệ.");
  }
}

function extractTextFromParagraphXml(paragraphXml: string): string {
  const parts: string[] = [];
  for (const m of paragraphXml.matchAll(W_TEXT_RE)) {
    if (m[1]) parts.push(m[1]);
  }
  return parts.join("").trim();
}

export async function extractParagraphs(docxBuffer: Buffer): Promise<DocxParagraph[]> {
  const zip = await loadDocxZip(docxBuffer);
  const xmlParts = Object.keys(zip.files).filter((name) => XML_PARTS_RE.test(name));
  const result: DocxParagraph[] = [];
  let globalIndex = 0;

  for (const xmlPath of xmlParts.sort()) {
    const xml = await zip.file(xmlPath)?.async("string");
    if (!xml) continue;
    for (const match of xml.matchAll(W_PARAGRAPH_RE)) {
      const text = extractTextFromParagraphXml(match[0]);
      if (text) {
        result.push({ index: globalIndex, text, xmlPath });
        globalIndex++;
      }
    }
  }
  return result;
}

export { loadDocxZip, XML_PARTS_RE, W_PARAGRAPH_RE };
