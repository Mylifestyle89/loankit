import fs from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

export { suggestAliasForPlaceholder } from "./placeholder-utils";

const BRACKET_RE = /\[([^\]\r\n]{1,200})\]/g;
// Paragraphs do not nest in OOXML — only <w:tbl> nests. Safe to use non-greedy match here.
const W_PARAGRAPH_RE = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
const W_TEXT_RE = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;

export type PlaceholderInventory = {
  template_path: string;
  parts_scanned: string[];
  placeholders: string[];
};

/**
 * Scan an XML part for bracket placeholders. Joins <w:t> text within each
 * paragraph (to catch split runs like `[Số</w:t>...<w:t> tiền]`) but keeps
 * paragraphs separate so a stray `[` in one paragraph cannot pair with `]`
 * in another.
 */
export function extractPlaceholdersFromXml(xml: string): string[] {
  const found: string[] = [];
  for (const pMatch of xml.matchAll(W_PARAGRAPH_RE)) {
    const paragraph = pMatch[0];
    const text = [...paragraph.matchAll(W_TEXT_RE)]
      .map((m) => decodeXmlEntities(m[1] ?? ""))
      .join("");
    if (!text.includes("[")) continue;
    for (const bMatch of text.matchAll(BRACKET_RE)) {
      const value = bMatch[1]?.trim();
      if (value) found.push(value);
    }
  }
  return found;
}

async function collectPlaceholders(zip: JSZip, partFilter: (name: string) => boolean): Promise<string[]> {
  const parts = Object.keys(zip.files).filter(partFilter);
  const placeholders = new Set<string>();
  for (const part of parts) {
    const xmlText = await zip.file(part)?.async("string");
    if (!xmlText) continue;
    for (const value of extractPlaceholdersFromXml(xmlText)) {
      placeholders.add(value);
    }
  }
  return Array.from(placeholders).sort((a, b) => a.localeCompare(b, "vi"));
}

export async function parseDocxPlaceholderInventory(templatePath: string): Promise<PlaceholderInventory> {
  const absolute = path.join(process.cwd(), templatePath);
  const docxBuffer = await fs.readFile(absolute);
  const zip = await JSZip.loadAsync(docxBuffer);
  const partFilter = (name: string) =>
    name === "word/document.xml" || /^word\/header\d+\.xml$/.test(name) || /^word\/footer\d+\.xml$/.test(name);
  const placeholders = await collectPlaceholders(zip, partFilter);
  const parts = Object.keys(zip.files).filter(partFilter).sort();
  return { template_path: templatePath, parts_scanned: parts, placeholders };
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/** Parse placeholders from a DOCX buffer directly (no filesystem access). */
export async function parseDocxPlaceholdersFromBuffer(buffer: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(buffer);
  const partFilter = (name: string) =>
    name === "word/document.xml" || /^word\/(header|footer|footnotes|endnotes)\d*\.xml$/.test(name);
  return collectPlaceholders(zip, partFilter);
}
