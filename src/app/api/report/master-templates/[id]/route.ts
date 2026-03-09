import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    await requireEditorOrAdmin();
    const { id } = await params;
    const result = await reportService.deleteMasterTemplate(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Failed to delete master template.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
