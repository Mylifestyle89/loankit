import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireOwnerOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { reportService } from "@/services/report.service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    // Ownership check: editor can only delete own master templates
    const master = await prisma.masterTemplate.findUnique({ where: { id } });
    await requireOwnerOrAdmin(master?.createdBy ?? "");
    const result = await reportService.deleteMasterTemplate(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Failed to delete master template.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
