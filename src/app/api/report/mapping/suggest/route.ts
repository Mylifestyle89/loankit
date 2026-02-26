import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { withRateLimit } from "@/lib/api-helpers";
import { aiMappingService } from "@/services/ai-mapping.service";

export const runtime = "nodejs";

type SuggestBody = {
  excelHeaders?: unknown;
  wordPlaceholders?: unknown;
  includeGrouping?: unknown;
};

export const POST = withRateLimit("suggest")(async (req: NextRequest) => {
  try {
    const body = (await req.json()) as SuggestBody;
    const excelHeaders = Array.isArray(body.excelHeaders) ? body.excelHeaders.map((v) => String(v)) : [];
    const wordPlaceholders = Array.isArray(body.wordPlaceholders)
      ? body.wordPlaceholders.map((v) => String(v))
      : [];

    const suggestion = await aiMappingService.suggestMapping(excelHeaders, wordPlaceholders, {
      includeGrouping: Boolean(body.includeGrouping),
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

