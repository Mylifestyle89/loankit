import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { loanPlanService } from "@/services/loan-plan.service";
import { requireSession, requireAdmin, handleAuthError } from "@/lib/auth-guard";
import { updatePlanSchema } from "@/lib/loan-plan/loan-plan-schemas";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const plan = await loanPlanService.getPlan(id);
    return NextResponse.json({ ok: true, plan });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to get loan plan.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const parsed = updatePlanSchema.parse(body);
    const plan = await loanPlanService.updatePlan(id, parsed);
    return NextResponse.json({ ok: true, plan });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = new ValidationError("Invalid request body.", error.flatten().fieldErrors);
      return NextResponse.json(
        { ok: false, error: validationError.message, details: validationError.details },
        { status: validationError.status },
      );
    }
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to update loan plan.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await loanPlanService.deletePlan(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to delete loan plan.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
