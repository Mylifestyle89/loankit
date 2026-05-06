import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError } from "@/core/errors/app-error";
import { requireSession, requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { withValidatedBody } from "@/lib/api-helpers";
import { withErrorHandling } from "@/lib/api/with-error-handling";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const loanId = req.nextUrl.searchParams.get("loan_id") ?? undefined;
    const masterTemplateId = req.nextUrl.searchParams.get("master_template_id") ?? undefined;
    const result = await reportService.getFieldValues({ loanId, masterTemplateId });
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
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

const repeaterItem = z.record(z.string(), z.unknown());
const scalarOrArray = z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(repeaterItem)]);

const valuesPutSchema = z.object({
  manual_values: z.record(z.string(), scalarOrArray).optional(),
  field_formulas: z.record(z.string(), z.string()).optional(),
  loan_id: z.string().optional(),
  master_template_id: z.string().optional(),
});

export const PUT = withErrorHandling(
  withValidatedBody(valuesPutSchema, async (body) => {
    await requireEditorOrAdmin();
    const result = await reportService.saveFieldValues({
      manualValues: body.manual_values,
      fieldFormulas: body.field_formulas,
      loanId: body.loan_id,
      masterTemplateId: body.master_template_id,
    });
    return NextResponse.json({
      ok: true,
      manual_values: result.manual_values,
      field_formulas: result.field_formulas,
    });
  }),
);
