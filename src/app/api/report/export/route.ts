import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { REPORT_ASSETS_BASE, validatePathUnderBase } from "@/lib/report/path-validation";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

function isAllowedAssetPath(v: string | undefined): boolean {
  if (v === undefined) return true;
  try {
    validatePathUnderBase(v, REPORT_ASSETS_BASE);
    return true;
  } catch {
    return false;
  }
}

const safePath = z
  .string()
  .optional()
  .refine(isAllowedAssetPath, { message: "Đường dẫn file không hợp lệ." });

const exportSchema = z.object({
  export_mode: z.enum(["bank_grouped"]).optional(),
  output_path: safePath,
  report_path: safePath,
  template_path: safePath,
  output_dir: safePath,
  group_key: z.string().max(100).optional(),
  repeat_key: z.string().max(100).optional(),
  customer_name_key: z.string().max(100).optional(),
  mapping_instance_id: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireEditorOrAdmin();
    const raw = await req.json().catch(() => {
      throw new ValidationError("Request body phải là JSON hợp lệ.");
    });
    const body = exportSchema.parse(raw);

    const result =
      body.export_mode === "bank_grouped"
        ? await reportService.processBankReportExport({
            reportPath: body.report_path,
            templatePath: body.template_path,
            outputDir: body.output_dir,
            groupKey: body.group_key,
            repeatKey: body.repeat_key,
            customerNameKey: body.customer_name_key,
            mappingInstanceId: body.mapping_instance_id,
          })
        : await reportService.runReportExport({
            outputPath: body.output_path,
            reportPath: body.report_path,
            templatePath: body.template_path,
            mappingInstanceId: body.mapping_instance_id,
          });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    console.error("[Export API] Caught error:", error);
    console.error("[Export API] Error type:", error?.constructor?.name);
    console.error("[Export API] Error message:", error instanceof Error ? error.message : String(error));

    if (error instanceof z.ZodError) {
      const validationError = new ValidationError("Dữ liệu request không hợp lệ.", error.flatten().fieldErrors);
      return NextResponse.json(
        { ok: false, error: validationError.message, details: validationError.details },
        { status: validationError.status },
      );
    }
    const httpError = toHttpError(error, "Export failed.");
    console.error("[Export API] HTTP Error status:", httpError.status);
    console.error("[Export API] HTTP Error message:", httpError.message);

    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}
