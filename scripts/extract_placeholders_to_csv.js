/* eslint-disable no-console */

// Simple helper script to extract [placeholders] from a DOCX file
// Usage:
//   node scripts/extract_placeholders_to_csv.js "Placeholder Prototype.docx"
//
// Output:
//   placeholders.csv in the project root, one placeholder per line.

const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

const BRACKET_RE = /\[([^\]\r\n]{1,200})\]/g;

async function extractPlaceholders(docxPath) {
  const absolute = path.isAbsolute(docxPath) ? docxPath : path.join(process.cwd(), docxPath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`DOCX file not found: ${absolute}`);
  }

  const buffer = fs.readFileSync(absolute);
  const zip = await JSZip.loadAsync(buffer);
  const parts = Object.keys(zip.files).filter((name) => {
    return (
      name === "word/document.xml" ||
      /^word\/header\d+\.xml$/.test(name) ||
      /^word\/footer\d+\.xml$/.test(name)
    );
  });

  const placeholders = new Set();
  for (const part of parts) {
    const file = zip.file(part);
    if (!file) continue;
    const xmlText = await file.async("string");
    for (const match of xmlText.matchAll(BRACKET_RE)) {
      const value = (match[1] || "").trim();
      if (value) {
        placeholders.add(value);
      }
    }
  }

  return Array.from(placeholders).sort((a, b) => a.localeCompare(b, "vi"));
}

async function main() {
  const docxPath = process.argv[2] || "Placeholder Prototype.docx";
  try {
    console.log(`Reading placeholders from: ${docxPath}`);
    const placeholders = await extractPlaceholders(docxPath);
    if (placeholders.length === 0) {
      console.log("No placeholders found.");
      return;
    }

    const outPath = path.join(process.cwd(), "placeholders.csv");
    const header = "placeholder";
    const lines = [header, ...placeholders.map((p) => `"${p.replace(/"/g, '""')}"`)];
    const csvContent = "\uFEFF" + lines.join("\r\n"); // UTF-8 BOM để Excel hiển thị tiếng Việt đúng
    fs.writeFileSync(outPath, csvContent, "utf8");
    console.log(`Wrote ${placeholders.length} placeholders to ${outPath}`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}

