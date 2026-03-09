import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const result = await reportService.deleteMasterTemplate(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to delete master template.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
