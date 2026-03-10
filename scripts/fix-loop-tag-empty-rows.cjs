/**
 * Fix empty rows in DOCX templates caused by loop tags in separate rows.
 * Moves [#prefix] and [/prefix] from standalone rows INTO the adjacent data row.
 */
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

const TEMPLATES_DIR = path.join(__dirname, "..", "report_assets", "Disbursement templates");
const TEMPLATE_FILES = [
  "2268.09.PN BCDX giai ngan HMTD.docx",
  "2268.10.PN Giay nhan no HMTD.docx",
];

async function fixTemplate(templatePath) {
  console.log("\nProcessing:", path.basename(templatePath));
  const buf = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(buf);
  let xml = await zip.file("word/document.xml").async("string");

  // Find all table rows
  const rowRegex = /<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g;
  const rows = [];
  let m;
  while ((m = rowRegex.exec(xml)) !== null) {
    const text = m[0].replace(/<[^>]+>/g, "").trim();
    rows.push({ content: m[0], text, index: m.index, length: m[0].length });
  }

  // Process in reverse to preserve indices
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    const loopOpenMatch = row.text.match(/^\[#(\w+)\]$/);
    const loopCloseMatch = row.text.match(/^\[\/(\w+)\]$/);

    if (loopOpenMatch) {
      // This is a standalone [#prefix] row — move tag into NEXT row's first cell
      const prefix = loopOpenMatch[1];
      const nextRow = rows[i + 1];
      if (!nextRow) continue;

      console.log(`  Moving [#${prefix}] into data row (row ${i} → ${i + 1})`);

      // Insert [#prefix] paragraph at start of first <w:tc> in next row
      const newNextRow = nextRow.content.replace(
        /(<w:tc\b[^>]*>)/,
        `$1<w:p><w:r><w:t xml:space="preserve">[#${prefix}]</w:t></w:r></w:p>`,
      );

      // Remove the standalone loop-open row, replace next row with modified version
      xml =
        xml.substring(0, row.index) +
        newNextRow +
        xml.substring(nextRow.index + nextRow.length);

      // Recalculate indices for remaining rows (shift everything after)
      const removedLen = row.length;
      for (let j = i + 2; j < rows.length; j++) {
        rows[j].index -= removedLen;
      }
      // Update next row position
      rows[i + 1].index = row.index;
      rows[i + 1].content = newNextRow;
      rows[i + 1].length = newNextRow.length;
    }
  }

  // Second pass: fix close tags (re-parse since indices changed)
  const rowRegex2 = /<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g;
  const rows2 = [];
  while ((m = rowRegex2.exec(xml)) !== null) {
    const text = m[0].replace(/<[^>]+>/g, "").trim();
    rows2.push({ content: m[0], text, index: m.index, length: m[0].length });
  }

  for (let i = rows2.length - 1; i >= 0; i--) {
    const row = rows2[i];
    const loopCloseMatch = row.text.match(/^\[\/(\w+)\]$/);

    if (loopCloseMatch) {
      const prefix = loopCloseMatch[1];
      const prevRow = rows2[i - 1];
      if (!prevRow) continue;

      console.log(`  Moving [/${prefix}] into data row (row ${i} → ${i - 1})`);

      // Insert [/prefix] paragraph at end of last <w:tc> in prev row
      const lastTcClose = prevRow.content.lastIndexOf("</w:tc>");
      if (lastTcClose < 0) continue;

      const newPrevRow =
        prevRow.content.substring(0, lastTcClose) +
        `<w:p><w:r><w:t xml:space="preserve">[/${prefix}]</w:t></w:r></w:p>` +
        prevRow.content.substring(lastTcClose);

      // Remove standalone close row, replace prev row
      xml =
        xml.substring(0, prevRow.index) +
        newPrevRow +
        xml.substring(row.index + row.length);
    }
  }

  // Save
  zip.file("word/document.xml", xml);
  const output = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync(templatePath, output);
  console.log("  Saved:", path.basename(templatePath));

  // Verify: no standalone loop-tag rows
  const verify = await JSZip.loadAsync(output);
  const vXml = await verify.file("word/document.xml").async("string");
  const vRowRegex = /<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g;
  let hasStandalone = false;
  while ((m = vRowRegex.exec(vXml)) !== null) {
    const t = m[0].replace(/<[^>]+>/g, "").trim();
    if (/^\[#\w+\]$/.test(t) || /^\[\/\w+\]$/.test(t)) {
      console.log("  WARNING: Still has standalone row:", t);
      hasStandalone = true;
    }
  }
  if (!hasStandalone) console.log("  OK: No standalone loop-tag rows remaining");
}

(async () => {
  for (const file of TEMPLATE_FILES) {
    const p = path.join(TEMPLATES_DIR, file);
    if (!fs.existsSync(p)) { console.log("Skip:", file); continue; }
    await fixTemplate(p);
  }
})().catch(console.error);
