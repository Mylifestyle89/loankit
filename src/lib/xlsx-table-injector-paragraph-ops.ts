/**
 * xlsx-table-injector-paragraph-ops.ts
 *
 * Utilities for scanning and extracting text from <w:p> paragraph elements
 * in OOXML document XML strings.
 */

/**
 * Find all <w:p> element boundaries in document XML.
 * Uses a positive lookahead so <w:pPr>, <w:pStyle> etc. are NOT matched.
 */
export function findParagraphs(xml: string): Array<{ start: number; end: number }> {
  const result: Array<{ start: number; end: number }> = [];
  const re = /<w:p(?=[>\s/])/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(xml)) !== null) {
    const start = m.index;
    const gt = xml.indexOf(">", start);
    if (gt === -1) continue;

    // Self-closing: <w:p ... />
    if (xml[gt - 1] === "/") {
      result.push({ start, end: gt + 1 });
      continue;
    }

    const closeIdx = xml.indexOf("</w:p>", gt);
    if (closeIdx === -1) continue;

    result.push({ start, end: closeIdx + 6 });
    re.lastIndex = closeIdx + 6; // advance past this paragraph
  }

  return result;
}

/**
 * Concatenate the text of all <w:t> elements in a paragraph XML snippet.
 * Tolerant of run-split placeholders where Word breaks a tag across runs.
 */
export function paragraphText(pXml: string): string {
  const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
  let text = "";
  let m: RegExpExecArray | null;
  while ((m = re.exec(pXml)) !== null) text += m[1];
  return text;
}
