/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

const ROOT = process.cwd();
const KHCN_DIR = path.join(ROOT, "report_assets", "KHCN templates");
const OUT_CSV = path.join(ROOT, "docs", "khcn-template-placeholder-fixes.csv");
const OUT_MD = path.join(ROOT, "docs", "khcn-template-placeholder-fixes.md");

const FIX_MAP = {
  "UNC.Tên người nhận": "UNC.Khách hàng thụ hưởng",
  "UNC.Ngân hàng": "UNC.Nơi mở tài khoản",
  "PA.HĐ cũ Số": "PA.Số HĐTD cũ",
  "PA.HĐ cũ Ngày": "PA.Ngày HĐTD cũ",
  "HĐTD.Tổng Nghĩa vụ bảo đảm tối đa": "HĐTD.Tổng nghĩa vụ bảo đảm tối đa",
};

function collectDocxFiles(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectDocxFiles(abs, acc);
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".docx") && !entry.name.startsWith("~$")) {
      acc.push(abs);
    }
  }
  return acc;
}

async function extractPlaceholders(docxAbsPath) {
  const buffer = fs.readFileSync(docxAbsPath);
  const zip = await JSZip.loadAsync(buffer);
  const parts = Object.keys(zip.files).filter((name) => (
    name === "word/document.xml" ||
    /^word\/header\d+\.xml$/.test(name) ||
    /^word\/footer\d+\.xml$/.test(name)
  ));

  const found = new Set();
  const rawXmlJoined = [];
  const plainTextJoined = [];
  for (const part of parts) {
    const file = zip.file(part);
    if (!file) continue;
    const xmlText = await file.async("string");
    rawXmlJoined.push(xmlText);
    // Flatten xml tags to plain text to survive run-splitting in DOCX.
    plainTextJoined.push(
      xmlText
        .replace(/<w:tab\/>/g, "\t")
        .replace(/<w:br\/>/g, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&"),
    );
  }

  const rawAll = rawXmlJoined.join("\n");
  const plainAll = plainTextJoined.join("\n");
  for (const key of Object.keys(FIX_MAP)) {
    if (
      rawAll.includes(key) ||
      rawAll.includes(`[${key}]`) ||
      rawAll.includes(`{${key}}`) ||
      rawAll.includes(`{{${key}}}`) ||
      plainAll.includes(key) ||
      plainAll.includes(`[${key}]`) ||
      plainAll.includes(`{${key}}`) ||
      plainAll.includes(`{{${key}}}`)
    ) {
      found.add(key);
    }
  }
  return found;
}

function csvEscape(s) {
  return `"${String(s).replace(/"/g, "\"\"")}"`;
}

async function main() {
  if (!fs.existsSync(KHCN_DIR)) {
    throw new Error(`Directory not found: ${KHCN_DIR}`);
  }

  const docxFiles = collectDocxFiles(KHCN_DIR).sort((a, b) => a.localeCompare(b, "vi"));
  const rows = [];
  const fileHitCount = new Map();

  for (const abs of docxFiles) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
    let placeholders;
    try {
      placeholders = await extractPlaceholders(abs);
    } catch (err) {
      rows.push({
        file: rel,
        oldPlaceholder: "(read_error)",
        suggestedPlaceholder: "",
        note: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    for (const [oldKey, newKey] of Object.entries(FIX_MAP)) {
      if (!placeholders.has(oldKey)) continue;
      rows.push({
        file: rel,
        oldPlaceholder: oldKey,
        suggestedPlaceholder: newKey,
        note: "replace",
      });
      fileHitCount.set(rel, (fileHitCount.get(rel) || 0) + 1);
    }
  }

  const csvLines = [
    "\uFEFFfile,old_placeholder,suggested_placeholder,note",
    ...rows.map((r) => [
      csvEscape(r.file),
      csvEscape(r.oldPlaceholder),
      csvEscape(r.suggestedPlaceholder),
      csvEscape(r.note),
    ].join(",")),
  ];
  fs.writeFileSync(OUT_CSV, csvLines.join("\r\n"), "utf8");

  const totalHits = rows.filter((r) => r.note === "replace").length;
  const touchedFiles = new Set(rows.filter((r) => r.note === "replace").map((r) => r.file)).size;
  const md = [];
  md.push("# KHCN template placeholder quick-fix report");
  md.push("");
  md.push(`- Scanned DOCX files: ${docxFiles.length}`);
  md.push(`- Files needing replacement: ${touchedFiles}`);
  md.push(`- Total replacement hits: ${totalHits}`);
  md.push("");
  md.push("## Replacement map");
  md.push("");
  md.push("| Old placeholder | Suggested placeholder |");
  md.push("|---|---|");
  for (const [oldKey, newKey] of Object.entries(FIX_MAP)) {
    md.push(`| ${oldKey} | ${newKey} |`);
  }
  md.push("");
  md.push("## Files with hits");
  md.push("");
  if (touchedFiles === 0) {
    md.push("No legacy placeholders detected.");
  } else {
    md.push("| File | Hits |");
    md.push("|---|---:|");
    for (const [file, hits] of Array.from(fileHitCount.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "vi"))) {
      md.push(`| ${file} | ${hits} |`);
    }
  }
  md.push("");
  md.push("## Detailed rows");
  md.push("");
  md.push("| File | Old | Suggested |");
  md.push("|---|---|---|");
  for (const row of rows.filter((r) => r.note === "replace")) {
    md.push(`| ${row.file} | ${row.oldPlaceholder} | ${row.suggestedPlaceholder} |`);
  }
  fs.writeFileSync(OUT_MD, `${md.join("\n")}\n`, "utf8");

  console.log(`Scanned ${docxFiles.length} DOCX files.`);
  console.log(`Found ${totalHits} legacy placeholder hits across ${touchedFiles} files.`);
  console.log(`Wrote: ${path.relative(ROOT, OUT_CSV).replace(/\\/g, "/")}`);
  console.log(`Wrote: ${path.relative(ROOT, OUT_MD).replace(/\\/g, "/")}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});

