import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { parseExtractRequestForm, runExtractProcess } from "@/app/api/report/mapping/_extract-helper";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const context = await parseExtractRequestForm(form);
    const result = await runExtractProcess({
      context,
    });

    return NextResponse.json({
      ok: true,
      kind: result.kind,
      suggestions: result.suggestions,
      repeaterSuggestions: result.repeaterSuggestions ?? [],
      meta: result.meta,
    });
  } catch (error) {
    const httpError = toHttpError(error, "Extract process failed.");
    return NextResponse.json(
      { ok: false, error: httpError.message, details: httpError.details },
      { status: httpError.status },
    );
  }
}

