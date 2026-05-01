import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { toHttpError } from "@/core/errors/app-error";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import {
  parseExtractRequestForm,
  runExtractProcess,
  validateOcrFile,
} from "@/app/api/report/mapping/_extract-helper";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireEditorOrAdmin();
    const rl = checkRateLimit(`ocr-process:${getClientIp(req)}`, 10, 60_000);
    if (!rl.allowed) return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
    const form = await req.formData();
    const context = await parseExtractRequestForm(form);
    validateOcrFile(context.file);
    const result = await runExtractProcess({
      context,
      preferredKind: "ocr",
    });

    return NextResponse.json({
      ok: true,
      suggestions: result.suggestions,
      meta: result.meta,
    });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "OCR process failed.");
    return NextResponse.json(
      { ok: false, error: httpError.message, details: httpError.details },
      { status: httpError.status },
    );
  }
}

