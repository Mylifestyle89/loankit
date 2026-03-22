import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { loanPlanService } from "@/services/loan-plan.service";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const template = await loanPlanService.getTemplate(id);
    return NextResponse.json({ ok: true, template });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to get template.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
