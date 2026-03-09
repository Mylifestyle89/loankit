import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import {
  parseExtractRequestForm,
  runExtractProcess,
  validateOcrFile,
} from "@/app/api/report/mapping/_extract-helper";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
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
    const httpError = toHttpError(error, "OCR process failed.");
    return NextResponse.json(
      { ok: false, error: httpError.message, details: httpError.details },
      { status: httpError.status },
    );
  }
}

