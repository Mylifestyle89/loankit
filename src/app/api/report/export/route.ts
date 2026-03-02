import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

const allowedBase = path.resolve(process.cwd(), "report_assets");

function isAllowedAssetPath(v: string | undefined): boolean {
  if (v === undefined) return true;
  const resolved = path.resolve(process.cwd(), v);
  return resolved.startsWith(allowedBase + path.sep) || resolved === allowedBase;
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

    // Extract detailed error info
    let detailsStr = error instanceof Error ? error.message : String(error);
    if (error && typeof error === "object" && "details" in error) {
      const details = (error as any).details;
      if (details && typeof details === "object") {
        detailsStr = JSON.stringify(details, null, 2).slice(0, 500);
      } else if (typeof details === "string") {
        detailsStr = details;
      }
    }
    console.error("[Export API] Details:", detailsStr);

    return NextResponse.json(
      { ok: false, error: httpError.message, details: detailsStr },
      { status: httpError.status },
    );
  }
}
