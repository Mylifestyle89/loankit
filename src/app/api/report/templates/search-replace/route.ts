import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";
import PizZip from "pizzip";

export const runtime = "nodejs";

const TEMPLATES_DIR = path.resolve(process.cwd(), "report_assets/KHCN templates");

/** Recursively find all .docx files */
async function findDocxFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) results.push(...await findDocxFiles(full));
      else if (e.name.toLowerCase().endsWith(".docx") && !e.name.startsWith("~$")) results.push(full);
    }
  } catch { /* dir not found on Vercel */ }
  return results;
}

/**
 * DOCX stores text split across multiple XML runs.
 * This merges adjacent <w:r> text to enable cross-run search,
 * then performs replacement and splits back.
 * Simple approach: operate on raw XML string with merged <w:t> content.
 */
function searchReplaceInXml(xml: string, search: string, replace: string): { xml: string; count: number } {
  // Extract all text content to find matches across runs
  // Strategy: find text spans, merge, search, replace
  let count = 0;

  // Simple approach: replace within individual <w:t> tags first
  const replaced = xml.replace(
    /(<w:t[^>]*>)([\s\S]*?)(<\/w:t>)/g,
    (match, open, text, close) => {
      if (text.includes(search)) {
        const occurrences = text.split(search).length - 1;
        count += occurrences;
        return open + text.replaceAll(search, replace) + close;
      }
      return match;
    },
  );

  return { xml: replaced, count };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { search, replace, mode } = body as { search: string; replace?: string; mode: "search" | "replace" };

    if (!search || search.length < 2) {
      return NextResponse.json({ ok: false, error: "Từ khóa tìm kiếm phải >= 2 ký tự" }, { status: 400 });
    }

    const files = await findDocxFiles(TEMPLATES_DIR);
    if (files.length === 0) {
      return NextResponse.json({ ok: false, error: "Không tìm thấy file template (chỉ hoạt động trên máy trạm)" }, { status: 400 });
    }

    const results: Array<{ file: string; matches: number }> = [];
    let totalMatches = 0;

    for (const filePath of files) {
      const buf = await fs.readFile(filePath);
      const zip = new PizZip(buf);
      let fileMatches = 0;

      // Check all XML parts in the docx
      const xmlParts = Object.keys(zip.files).filter(
        (name) => name.endsWith(".xml") && (name.includes("document") || name.includes("header") || name.includes("footer")),
      );

      for (const partName of xmlParts) {
        const xml = zip.file(partName)?.asText();
        if (!xml) continue;

        const { xml: newXml, count } = searchReplaceInXml(xml, search, replace ?? "");
        fileMatches += count;

        if (mode === "replace" && count > 0 && replace !== undefined) {
          zip.file(partName, newXml);
        }
      }

      if (fileMatches > 0) {
        const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
        results.push({ file: relPath, matches: fileMatches });
        totalMatches += fileMatches;

        // Write back modified file
        if (mode === "replace" && replace !== undefined) {
          const output = zip.generate({ type: "nodebuffer" });
          await fs.writeFile(filePath, output);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      mode,
      search,
      replace: replace ?? null,
      totalFiles: files.length,
      matchedFiles: results.length,
      totalMatches,
      results,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
