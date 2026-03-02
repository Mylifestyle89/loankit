import { NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError } from "@/core/errors/app-error";
import { withErrorHandling, withValidatedBody } from "@/lib/api-helpers";
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

const repeaterItem = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()]));
const scalarOrArray = z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(repeaterItem)]);

const valuesPutSchema = z.object({
  manual_values: z.record(z.string(), scalarOrArray).optional(),
  field_formulas: z.record(z.string(), z.string()).optional(),
});

export const PUT = withErrorHandling(
  withValidatedBody(valuesPutSchema, async (body) => {
    const result = await reportService.saveFieldValues({
      manualValues: body.manual_values,
      fieldFormulas: body.field_formulas,
    });
    return NextResponse.json({
      ok: true,
      manual_values: result.manual_values,
      field_formulas: result.field_formulas,
    });
  }),
  "Failed to save manual values.",
);
