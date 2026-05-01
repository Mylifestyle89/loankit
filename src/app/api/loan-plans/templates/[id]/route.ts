import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireSession, handleAuthError } from "@/lib/auth-guard";
import { loanPlanService } from "@/services/loan-plan.service";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const template = await loanPlanService.getTemplate(id);
    return NextResponse.json({ ok: true, template });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Failed to get template.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
