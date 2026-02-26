import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import {
  parseExtractRequestForm,
  runExtractProcess,
  validateDocxFile,
} from "@/app/api/report/mapping/_extract-helper";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
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
    const httpError = toHttpError(error, "DOCX extraction failed.");
    return NextResponse.json(
      { ok: false, error: httpError.message, details: httpError.details },
      { status: httpError.status },
    );
  }
}
