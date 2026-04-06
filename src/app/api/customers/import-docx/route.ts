import { NextRequest, NextResponse } from "next/server";

import { requireEditorOrAdmin } from "@/lib/auth-guard";
import { extractParagraphs } from "@/services/auto-tagging-docx-parser";
import {
  extractCustomerDataFromText,
  mergeExtractionResults,
  type ExtractionResult,
} from "@/services/customer-docx-extraction.service";

export const runtime = "nodejs";

/** 10MB per file — .docx rarely exceeds this */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * POST /api/customers/import-docx
 * Upload 1+ .docx files → AI extract customer/loan/collateral info
 */
export async function POST(request: NextRequest) {
  try {
    await requireEditorOrAdmin();

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ ok: false, error: "Chưa chọn file nào." }, { status: 400 });
    }

    // Validate files: .docx extension + size limit
    for (const file of files) {
      if (!file.name.endsWith(".docx")) {
        return NextResponse.json(
          { ok: false, error: `File "${file.name}" không phải định dạng .docx.` },
          { status: 400 },
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { ok: false, error: `File "${file.name}" vượt quá 10MB.` },
          { status: 400 },
        );
      }
    }

    // Extract text from each file, then AI parse in parallel
    const extractionPromises = files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const paragraphs = await extractParagraphs(buffer);
      const documentText = paragraphs.map((p) => p.text).join("\n");
      if (!documentText.trim()) return null;
      const extracted = await extractCustomerDataFromText(documentText);
      return { extracted, source: file.name };
    });

    const settled = await Promise.allSettled(extractionPromises);
    const results: ExtractionResult[] = [];
    const sources: string[] = [];

    for (const s of settled) {
      if (s.status === "fulfilled" && s.value) {
        results.push(s.value.extracted);
        sources.push(s.value.source);
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Không trích xuất được nội dung từ các file." },
        { status: 400 },
      );
    }

    const merged = mergeExtractionResults(results);

    return NextResponse.json({ ok: true, extracted: merged, sources });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error("[import-docx] Error:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
