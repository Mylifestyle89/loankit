import fs from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

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

export function suggestAliasForPlaceholder(placeholder: string, fieldKeys: string[]): string[] {
  const normalized = placeholder.trim().toLowerCase();
  const noPrefix = normalized.includes(".") ? normalized.split(".").slice(1).join(".") : normalized;
  return fieldKeys
    .filter((field) => {
      const key = field.toLowerCase();
      return key.endsWith(noPrefix.replaceAll(" ", "_")) || key.includes(noPrefix.replaceAll(" ", "_"));
    })
    .slice(0, 5);
}
