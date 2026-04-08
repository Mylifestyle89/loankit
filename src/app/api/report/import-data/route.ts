import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { handleAuthError, requireEditorOrAdmin } from "@/lib/auth-guard";
import { reportService } from "@/services/report.service";
import { parseXlsxToImportData } from "@/services/report/customer-xlsx-io.service";

const importSchema = z.object({
  version: z.unknown().refine((v) => v !== undefined && v !== null, {
    message: "version là bắt buộc.",
  }),
  customers: z.array(z.record(z.string(), z.unknown())),
  field_templates: z.array(z.record(z.string(), z.unknown())),
});

export async function POST(req: NextRequest) {
  try {
    await requireEditorOrAdmin();
    const contentType = req.headers.get("content-type") ?? "";

    let data: { version?: unknown; customers?: unknown[]; field_templates?: unknown[] };

    if (contentType.includes("multipart/form-data")) {
      // XLSX file upload
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) throw new ValidationError("Không tìm thấy file trong request.");

      const buffer = Buffer.from(await file.arrayBuffer());
      data = parseXlsxToImportData(buffer);
    } else {
      // JSON body
      const raw = await req.json().catch(() => {
        throw new ValidationError("Request body phải là JSON hợp lệ.");
      });
      data = importSchema.parse(raw);
    }

    const imported = await reportService.importData(data);
    return NextResponse.json({ ok: true, imported });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    if (error instanceof z.ZodError) {
      // Log schema details server-side only; response omits `details` to avoid
      // leaking internal field structure to clients.
      console.error("[api/report/import-data] Zod validation failed:", error.flatten().fieldErrors);
      const validationError = new ValidationError("Định dạng file không hợp lệ.");
      return NextResponse.json(
        { ok: false, error: validationError.message },
        { status: validationError.status },
      );
    }
    const httpError = toHttpError(error, "Nhập dữ liệu thất bại");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
