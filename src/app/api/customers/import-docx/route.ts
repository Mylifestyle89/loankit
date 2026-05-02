import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
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

    if (files.length > 5) {
      return NextResponse.json({ ok: false, error: "Tối đa 5 file mỗi lần tải lên." }, { status: 400 });
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
    const errors: string[] = [];

    for (const s of settled) {
      if (s.status === "fulfilled" && s.value) {
        results.push(s.value.extracted);
        sources.push(s.value.source);
      } else if (s.status === "rejected") {
        const msg = s.reason instanceof Error ? s.reason.message : String(s.reason);
        console.error("[import-docx] File extraction failed:", msg);
        errors.push(msg);
      }
    }

    if (results.length === 0) {
      const detail = errors.length > 0
        ? `Trích xuất thất bại: ${errors[0]}`
        : "Không trích xuất được nội dung từ các file.";
      return NextResponse.json({ ok: false, error: detail }, { status: 400 });
    }

    const merged = mergeExtractionResults(results);

    return NextResponse.json({ ok: true, extracted: merged, sources });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error("[import-docx] Error:", error);
    const httpError = toHttpError(error, "Lỗi không xác định.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
