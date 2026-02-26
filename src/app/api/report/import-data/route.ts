import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

const importSchema = z.object({
  version: z.unknown().refine((v) => v !== undefined && v !== null, {
    message: "version là bắt buộc.",
  }),
  customers: z.array(z.record(z.string(), z.unknown())),
  field_templates: z.array(z.record(z.string(), z.unknown())),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => {
      throw new ValidationError("Request body phải là JSON hợp lệ.");
    });
    const data = importSchema.parse(raw);
    const imported = await reportService.importData(data);
    return NextResponse.json({ ok: true, imported });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = new ValidationError("Định dạng file không hợp lệ.", error.flatten().fieldErrors);
      return NextResponse.json(
        { ok: false, error: validationError.message, details: validationError.details },
        { status: validationError.status },
      );
    }
    const httpError = toHttpError(error, "Nhập dữ liệu thất bại");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
