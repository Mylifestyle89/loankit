import { NextRequest, NextResponse } from "next/server";

import { ValidationError, toHttpError } from "@/core/errors/app-error";
import { withRateLimit } from "@/lib/api-helpers";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { financialAnalysisService } from "@/services/financial-analysis.service";

export const runtime = "nodejs";

export const POST = withRateLimit("financial-analyze")(async (req: NextRequest) => {
  try {
    await requireEditorOrAdmin();
    const body = await req.json();

    if (!body || typeof body !== "object") {
      throw new ValidationError("Request body phải là JSON object.");
    }

    const { bctcData, fields, qualitativeContext } = body;

    if (!bctcData || typeof bctcData !== "object") {
      throw new ValidationError("Thiếu bctcData.");
    }
    if (!Array.isArray(fields) || fields.length === 0) {
      throw new ValidationError("Thiếu fields (danh sách trường cần phân tích).");
    }

    const result = await financialAnalysisService.analyze({
      bctcData,
      fields,
      qualitativeContext,
    });

    return NextResponse.json({
      ok: true,
      values: result.values,
      model: result.model,
      provider: result.provider,
    });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Không thể tạo phân tích tài chính.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
});
