import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { toHttpError } from "@/core/errors/app-error";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import {
  parseExtractRequestForm,
  runExtractProcess,
  validateDocxFile,
} from "@/app/api/report/mapping/_extract-helper";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireEditorOrAdmin();
    const rl = checkRateLimit(`docx-process:${getClientIp(req)}`, 10, 60_000);
    if (!rl.allowed) return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
    const form = await req.formData();
    const context = await parseExtractRequestForm(form);
    validateDocxFile(context.file);
    const result = await runExtractProcess({
      context,
      preferredKind: "docx",
    });

    return NextResponse.json({
      ok: true,
      suggestions: result.suggestions,
      repeaterSuggestions: result.repeaterSuggestions,
      meta: result.meta,
    });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "DOCX extraction failed.");
    return NextResponse.json(
      { ok: false, error: httpError.message, details: httpError.details },
      { status: httpError.status },
    );
  }
}
