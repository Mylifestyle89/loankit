/**
 * Fix corrupted Giấy nhận nợ template:
 * The loop tag rows ([#UNC], [/UNC], [#HD], [/HD]) were inserted without
 * proper <w:tcPr> (table cell properties), causing Word to reject the file.
 *
 * Fix: Remove the bare loop tag rows, then re-insert them with proper
 * cell properties copied from the adjacent data row.
 */
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

const TEMPLATES = [
  "2268.10.PN Giay nhan no HMTD.docx",
  "2268.09.PN BCDX giai ngan HMTD.docx",
];

const targetFile = process.argv[2];
const filesToProcess = targetFile
  ? TEMPLATES.filter((f) => f.includes(targetFile))
  : TEMPLATES;

async function fix(TEMPLATE_PATH) {
  console.log("\nFixing:", path.basename(TEMPLATE_PATH));
  const buf = fs.readFileSync(TEMPLATE_PATH);
  const zip = await JSZip.loadAsync(buf);
  let xml = await zip.file("word/document.xml").async("string");

  // Step 1: Remove existing bare loop tag rows
  // These are rows like <w:tr><w:tc><w:p><w:r><w:t ...>[#UNC]</w:t>...
  // that lack <w:tcPr> elements
  const bareRowRegex = /<w:tr>(?:<w:tc><w:p><w:r><w:t[^>]*>[^<]*<\/w:t><\/w:r><\/w:p><\/w:tc>)+<\/w:tr>/g;
  const before = xml.length;
  xml = xml.replace(bareRowRegex, (match) => {
    const text = match.replace(/<[^>]+>/g, "").trim();
    if (text.match(/^\[[\/#](?:UNC|HD)\]/)) {
      console.log("Removing bare loop row:", text);
      return "";
    }
    return match;
  });
  console.log("Removed", before - xml.length, "chars of bare loop rows");

  // Step 2: Find data rows containing placeholders and wrap with proper loop rows
  xml = wrapWithProperLoopRows(xml, "UNC");
  xml = wrapWithProperLoopRows(xml, "HD");

  // Step 3: Rename [UNC.xxx] -> [xxx] and [HD.xxx] -> [xxx] inside loop sections
  xml = xml.replace(/\[UNC\.([^\]]+)\]/g, "[$1]");
  xml = xml.replace(/\[HD\.([^\]]+)\]/g, "[$1]");

  // Save
  zip.file("word/document.xml", xml);
  const output = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync(TEMPLATE_PATH, output);
  console.log("Saved fixed template.");

  // Verify
  const verify = await JSZip.loadAsync(output);
  const vxml = await verify.file("word/document.xml").async("string");
  const text = vxml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  console.log("Has [#UNC]:", text.includes("[#UNC]"));
  console.log("Has [/UNC]:", text.includes("[/UNC]"));
  console.log("Has [#HD]:", text.includes("[#HD]"));
  console.log("Has [/HD]:", text.includes("[/HD]"));
  const remaining = text.match(/\[(?:UNC|HD)\.[^\]]+\]/g);
  console.log("Remaining prefixed placeholders:", remaining || "none");
}

function wrapWithProperLoopRows(xml, prefix) {
  // Find table rows containing [prefix.xxx] or [xxx] that are data rows
  const rowRegex = /<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g;
  let match;
  const dataRows = [];

  while ((match = rowRegex.exec(xml)) !== null) {
    const rowText = match[0].replace(/<[^>]+>/g, "");
    // Check for placeholders like [STT] (already renamed) or [prefix.xxx] (not yet renamed)
    const hasPlaceholder = rowText.includes(`[${prefix}.`) ||
      (prefix === "UNC" && (rowText.includes("[STT]") && rowText.includes("[Số tiền]"))) ||
      (prefix === "UNC" && rowText.includes("[Khách hàng thụ hưởng]")) ||
      (prefix === "HD" && rowText.includes("[Số hóa đơn]"));

    if (hasPlaceholder) {
      dataRows.push({ content: match[0], index: match.index });
    }
  }

  if (dataRows.length === 0) {
    console.log(`No data rows found for ${prefix}`);
    return xml;
  }

  console.log(`Found ${dataRows.length} data row(s) for ${prefix}`);

  // Extract cell properties from the data row to build proper loop tag rows
  for (let i = dataRows.length - 1; i >= 0; i--) {
    const row = dataRows[i];
    const openRow = buildLoopTagRow(row.content, `[#${prefix}]`);
    const closeRow = buildLoopTagRow(row.content, `[/${prefix}]`);

    const insertAfter = row.index + row.content.length;
    xml = xml.substring(0, row.index) + openRow + row.content + closeRow + xml.substring(insertAfter);
  }

  return xml;
}

function buildLoopTagRow(referenceRow, tagText) {
  // Extract cells from reference row and copy their tcPr
  const cellRegex = /<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g;
  let match;
  const cells = [];

  while ((match = cellRegex.exec(referenceRow)) !== null) {
    const cellContent = match[1];
    const tcPrMatch = cellContent.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/);
    cells.push(tcPrMatch ? tcPrMatch[0] : null);
  }

  if (cells.length === 0) {
    // Fallback: bare row (shouldn't happen)
    return `<w:tr><w:tc><w:p><w:r><w:t xml:space="preserve">${tagText}</w:t></w:r></w:p></w:tc></w:tr>`;
  }

  // Extract trPr from reference row if present
  const trPrMatch = referenceRow.match(/<w:trPr>[\s\S]*?<\/w:trPr>/);
  const trPr = trPrMatch ? trPrMatch[0] : "";

  // Build cells: first cell has tag text, rest are empty — all with proper tcPr
  let rowXml = "<w:tr>";
  if (trPr) rowXml += trPr;

  for (let i = 0; i < cells.length; i++) {
    rowXml += "<w:tc>";
    if (cells[i]) rowXml += cells[i];
    rowXml += "<w:p><w:r><w:t xml:space=\"preserve\">";
    rowXml += i === 0 ? tagText : "";
    rowXml += "</w:t></w:r></w:p></w:tc>";
  }

  rowXml += "</w:tr>";
  return rowXml;
}

(async () => {
  for (const file of filesToProcess) {
    const templatePath = path.join(__dirname, "..", "report_assets", "Disbursement templates", file);
    if (!fs.existsSync(templatePath)) {
      console.log("Skipping (not found):", file);
      continue;
    }
    await fix(templatePath);
  }
})().catch(console.error);
