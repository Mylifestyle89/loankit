import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await reportService.getFieldValues();
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to load field values.");
    return NextResponse.json(
      {
        ok: false,
        error: httpError.message,
      },
      { status: httpError.status },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      manual_values?: Record<string, string | number | boolean | null>;
      field_formulas?: Record<string, string>;
    };
    const result = await reportService.saveFieldValues({
      manualValues: body.manual_values,
      fieldFormulas: body.field_formulas,
    });
    return NextResponse.json({
      ok: true,
      manual_values: result.manual_values,
      field_formulas: result.field_formulas,
    });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to save manual values.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}
