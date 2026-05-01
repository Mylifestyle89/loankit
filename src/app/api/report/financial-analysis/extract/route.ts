import { NextRequest, NextResponse } from "next/server";
import path from "node:path";

import { ValidationError, toHttpError } from "@/core/errors/app-error";
import { requireSession, handleAuthError } from "@/lib/auth-guard";
import { extractBctc } from "@/lib/bctc-extractor";

export const runtime = "nodejs";

const ALLOWED_EXTS = new Set([".xlsx", ".xls"]);

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ValidationError("Thiếu file upload.");
    }

    const ext = path.extname(file.name || "").toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) {
      throw new ValidationError(`Chỉ hỗ trợ file Excel (.xlsx, .xls). Nhận được: ${ext}`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = extractBctc(buffer);

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Không thể trích xuất dữ liệu BCTC.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}
