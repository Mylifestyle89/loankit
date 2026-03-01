import fs from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

export { suggestAliasForPlaceholder } from "./placeholder-utils";

const BRACKET_RE = /\[([^\]\r\n]{1,200})\]/g;

export type PlaceholderInventory = {
  template_path: string;
  parts_scanned: string[];
  placeholders: string[];
};

export async function parseDocxPlaceholderInventory(templatePath: string): Promise<PlaceholderInventory> {
  const absolute = path.join(process.cwd(), templatePath);
  const docxBuffer = await fs.readFile(absolute);
  const zip = await JSZip.loadAsync(docxBuffer);
  const parts = Object.keys(zip.files).filter((name) => {
    return name === "word/document.xml" || /^word\/header\d+\.xml$/.test(name) || /^word\/footer\d+\.xml$/.test(name);
  });

  const placeholders = new Set<string>();
  for (const part of parts) {
    const xmlText = await zip.file(part)?.async("string");
    if (!xmlText) {
      continue;
    }
    for (const match of xmlText.matchAll(BRACKET_RE)) {
      const value = match[1]?.trim();
      if (value) {
        placeholders.add(value);
      }
    }
  }

  return {
    template_path: templatePath,
    parts_scanned: parts.sort(),
    placeholders: Array.from(placeholders).sort((a, b) => a.localeCompare(b, "vi")),
  };
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Parse placeholders from a DOCX buffer directly (no file system access needed).
 * Joins all <w:t> text fragments before matching to catch placeholders split
 * across multiple runs by Word's internal formatting.
 */
export async function parseDocxPlaceholdersFromBuffer(buffer: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(buffer);
  const parts = Object.keys(zip.files).filter((name) =>
    name === "word/document.xml" ||
    /^word\/(header|footer|footnotes|endnotes)\d*\.xml$/.test(name),
  );

  const placeholders = new Set<string>();
  for (const part of parts) {
    const xmlText = await zip.file(part)?.async("string");
    if (!xmlText) continue;
    const textContent = [...xmlText.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
      .map((m) => decodeXmlEntities(m[1] ?? ""))
      .join("");
    for (const match of textContent.matchAll(BRACKET_RE)) {
      const value = match[1]?.trim();
      if (value) placeholders.add(value);
    }
  }
  return Array.from(placeholders).sort((a, b) => a.localeCompare(b, "vi"));
}

