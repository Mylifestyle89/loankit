import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { withRateLimit } from "@/lib/api-helpers";
import { aiMappingService, type FieldHint } from "@/services/ai-mapping.service";

export const runtime = "nodejs";

type SuggestBody = {
  excelHeaders?: unknown;
  wordPlaceholders?: unknown;
  includeGrouping?: unknown;
  fieldHints?: unknown;
};

export const POST = withRateLimit("suggest")(async (req: NextRequest) => {
  try {
    const body = (await req.json()) as SuggestBody;
    const excelHeaders = Array.isArray(body.excelHeaders) ? body.excelHeaders.map((v) => String(v)) : [];
    const wordPlaceholders = Array.isArray(body.wordPlaceholders)
      ? body.wordPlaceholders.map((v) => String(v))
      : [];

    // fieldHints là optional — validate sơ bộ trước khi pass xuống service
    const fieldHints: FieldHint[] | undefined = Array.isArray(body.fieldHints)
      ? (body.fieldHints as FieldHint[]).filter(
          (h) => h && typeof h === "object" && typeof h.key === "string" && typeof h.label === "string",
        )
      : undefined;

    const suggestion = await aiMappingService.suggestMapping(excelHeaders, wordPlaceholders, {
      includeGrouping: Boolean(body.includeGrouping),
      fieldHints,
    });
    return NextResponse.json({
      ok: true,
      suggestion: suggestion.mapping,
      grouping: suggestion.grouping,
    });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to suggest mapping.");
    return NextResponse.json(
      { ok: false, error: httpError.message, details: httpError.details },
      { status: httpError.status },
    );
  }
});

