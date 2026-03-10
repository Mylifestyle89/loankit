/**
 * Script to modify disbursement DOCX templates:
 * - Wrap UNC/HD table rows with docxtemplater loop tags [#UNC]...[/UNC] and [#HD]...[/HD]
 * - Rename inner placeholders from [UNC.xxx] to [xxx] (scoped inside loop)
 */
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

const TEMPLATES_DIR = path.join(__dirname, "..", "report_assets", "Disbursement templates");

// Process all templates that have UNC/HD placeholders
const TEMPLATE_FILES = [
  "2268.09.PN BCDX giai ngan HMTD.docx",
  "2268.10.PN Giay nhan no HMTD.docx",
];

// Allow selecting which template to process via CLI arg
const targetFile = process.argv[2];
const filesToProcess = targetFile
  ? TEMPLATE_FILES.filter((f) => f.includes(targetFile))
  : TEMPLATE_FILES;

async function modifyTemplate(TEMPLATE_PATH) {
  console.log("\nProcessing:", path.basename(TEMPLATE_PATH));
  const buf = fs.readFileSync(TEMPLATE_PATH);
  const zip = await JSZip.loadAsync(buf);
  let xml = await zip.file("word/document.xml").async("string");

  // Step 0: Fix whitespace-split placeholders like [ GN .xxx] → [GN.xxx]
  xml = fixWhitespacePlaceholders(xml);

  // Step 1: Merge split placeholders
  // docx often splits [UNC.STT] across multiple <w:r> runs like [UNC. + STT]
  // We need to merge them. Use a regex that finds opening [ in one run and closing ] in later runs.
  // Simple approach: remove XML tags between [ and ] within the same paragraph
  xml = mergeRunsInPlaceholders(xml);

  // Step 2: Find table rows with UNC placeholders and wrap with loop
  xml = wrapTableRowsWithLoop(xml, "UNC");
  xml = wrapTableRowsWithLoop(xml, "HD");

  // Step 3: Rename [UNC.xxx] → [xxx] inside loop sections, same for HD
  xml = renameLoopPlaceholders(xml, "UNC");
  xml = renameLoopPlaceholders(xml, "HD");

  // Save
  zip.file("word/document.xml", xml);
  const output = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync(TEMPLATE_PATH, output);
  console.log("Template modified successfully:", TEMPLATE_PATH);

  // Verify
  const verify = await JSZip.loadAsync(output);
  const verifyXml = await verify.file("word/document.xml").async("string");
  const text = verifyXml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  // Check for loop tags
  console.log("Has [#UNC]:", text.includes("[#UNC]"));
  console.log("Has [/UNC]:", text.includes("[/UNC]"));
  console.log("Has [#HD]:", text.includes("[#HD]"));
  console.log("Has [/HD]:", text.includes("[/HD]"));

  // Check no more UNC. or HD. prefixed placeholders
  const remaining = text.match(/\[(?:UNC|HD)\.[^\]]+\]/g);
  console.log("Remaining prefixed placeholders:", remaining || "none");
}

function mergeRunsInPlaceholders(xml) {
  // Find paragraphs that contain split placeholders
  // Pattern: text content has [ in one <w:t> and matching ] in a later <w:t> within same paragraph
  const paraRegex = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;

  return xml.replace(paraRegex, (para) => {
    // Extract all text from the paragraph
    const fullText = extractTextFromPara(para);

    // Check if there are any placeholder patterns like [xxx.yyy] or [xxx]
    if (!fullText.includes("[") || !fullText.includes("]")) return para;

    // Check if any placeholder is split across runs
    const runs = [];
    const runRegex = /<w:r\b[^>]*>[\s\S]*?<\/w:r>/g;
    let m;
    while ((m = runRegex.exec(para)) !== null) {
      const text = extractTextFromRun(m[0]);
      runs.push({ full: m[0], text, index: m.index });
    }

    // Try to merge runs that form split placeholders
    let merged = para;
    for (let i = 0; i < runs.length; i++) {
      if (runs[i].text.includes("[") && !runs[i].text.includes("]")) {
        // Start of split placeholder - find the closing ]
        let combined = runs[i].text;
        let endIdx = i;
        for (let j = i + 1; j < runs.length; j++) {
          combined += runs[j].text;
          endIdx = j;
          if (runs[j].text.includes("]")) break;
        }

        if (combined.includes("]")) {
          // Merge: keep first run's formatting, put combined text in it, remove others
          const firstRun = runs[i].full;
          const newRun = setTextInRun(firstRun, combined);

          // Build replacement: replace runs[i] through runs[endIdx]
          let oldSection = "";
          for (let k = i; k <= endIdx; k++) {
            oldSection += runs[k].full;
          }

          // Find the section in merged and replace
          const sectionIdx = merged.indexOf(oldSection);
          if (sectionIdx >= 0) {
            merged = merged.substring(0, sectionIdx) + newRun + merged.substring(sectionIdx + oldSection.length);
          }
        }
      }
    }

    return merged;
  });
}

function extractTextFromPara(para) {
  const texts = [];
  const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let m;
  while ((m = tRegex.exec(para)) !== null) {
    texts.push(m[1]);
  }
  return texts.join("");
}

function extractTextFromRun(run) {
  const texts = [];
  const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let m;
  while ((m = tRegex.exec(run)) !== null) {
    texts.push(m[1]);
  }
  return texts.join("");
}

function setTextInRun(run, newText) {
  // Replace text content in the first <w:t> and remove subsequent <w:t> elements
  let replaced = false;
  return run.replace(/<w:t[^>]*>[\s\S]*?<\/w:t>/g, (match) => {
    if (!replaced) {
      replaced = true;
      // Preserve xml:space="preserve" if present
      return match.replace(/>[\s\S]*?<\/w:t>/, ` xml:space="preserve">${newText}</w:t>`);
    }
    return ""; // Remove subsequent text elements
  });
}

function wrapTableRowsWithLoop(xml, prefix) {
  // Find table rows containing [prefix.xxx] patterns
  const rowRegex = /<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g;

  let modified = xml;
  const rows = [];
  let m;
  while ((m = rowRegex.exec(xml)) !== null) {
    const rowText = m[0].replace(/<[^>]+>/g, "");
    if (rowText.includes(`[${prefix}.`) || rowText.includes(`[${prefix.toLowerCase()}.`)) {
      rows.push({ content: m[0], index: m.index });
    }
  }

  if (rows.length === 0) {
    console.log(`No rows found with [${prefix}.xxx] placeholders`);
    return xml;
  }

  console.log(`Found ${rows.length} row(s) with [${prefix}.xxx] placeholders`);

  // Inject loop open/close tags INSIDE the data row's first/last cells
  // This avoids extra empty rows that paragraphLoop creates for standalone loop-tag rows
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    let newRow = row.content;

    // Insert [#prefix] as first paragraph in first <w:tc>
    newRow = newRow.replace(
      /<w:tc\b[^>]*>/,
      (match) => `${match}<w:p><w:r><w:t xml:space="preserve">[#${prefix}]</w:t></w:r></w:p>`,
    );

    // Insert [/prefix] as last paragraph in last <w:tc> (before </w:tc>)
    const lastTcClose = newRow.lastIndexOf("</w:tc>");
    if (lastTcClose >= 0) {
      newRow =
        newRow.substring(0, lastTcClose) +
        `<w:p><w:r><w:t xml:space="preserve">[/${prefix}]</w:t></w:r></w:p>` +
        newRow.substring(lastTcClose);
    }

    const insertAfterPos = row.index + row.content.length;
    modified = modified.substring(0, row.index) + newRow + modified.substring(insertAfterPos);
  }

  return modified;
}

function createLoopTagRow(xml, referenceRow, tagText) {
  // Create a minimal table row with a single cell containing the tag text
  // Copy the number of cells from the reference row to maintain table structure
  const cellCount = (referenceRow.match(/<w:tc\b/g) || []).length;

  // Build cells: first cell has the tag, rest are empty
  let cells = `<w:tc><w:p><w:r><w:t xml:space="preserve">${tagText}</w:t></w:r></w:p></w:tc>`;
  for (let i = 1; i < cellCount; i++) {
    cells += `<w:tc><w:p><w:r><w:t></w:t></w:r></w:p></w:tc>`;
  }

  return `<w:tr>${cells}</w:tr>`;
}

function renameLoopPlaceholders(xml, prefix) {
  // Rename [PREFIX.xxx] → [xxx]
  const regex = new RegExp(`\\[${prefix}\\.([^\\]]+)\\]`, "g");
  return xml.replace(regex, "[$1]");
}

function fixWhitespacePlaceholders(xml) {
  // After merging runs, some placeholders have internal whitespace like [ GN .xxx ]
  // Fix: normalize whitespace inside [...] tags in text content
  return xml.replace(/<w:t[^>]*>[^<]*<\/w:t>/g, (match) => {
    return match.replace(/\[\s*([^\]]+?)\s*\]/g, (_, inner) => {
      // Remove extra spaces around dots: " GN .xxx " → "GN.xxx"
      const cleaned = inner.replace(/\s*\.\s*/g, ".").trim();
      return `[${cleaned}]`;
    });
  });
}

(async () => {
  for (const file of filesToProcess) {
    const templatePath = path.join(TEMPLATES_DIR, file);
    if (!fs.existsSync(templatePath)) {
      console.log("Skipping (not found):", file);
      continue;
    }
    await modifyTemplate(templatePath);
  }
})().catch(console.error);
