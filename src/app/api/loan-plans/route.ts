import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { loanPlanService } from "@/services/loan-plan.service";
import { requireSession, requireAdmin, handleAuthError } from "@/lib/auth-guard";
import { createPlanSchema } from "@/lib/loan-plan/loan-plan-schemas";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const customerId = req.nextUrl.searchParams.get("customerId");
    if (!customerId) {
      return NextResponse.json({ ok: false, error: "customerId is required" }, { status: 400 });
    }
    const plans = await loanPlanService.listPlansForCustomer(customerId);
    return NextResponse.json({ ok: true, plans });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to list loan plans.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = createPlanSchema.parse(body);
    const plan = await loanPlanService.createPlanFromTemplate(parsed);
    return NextResponse.json({ ok: true, plan }, { status: 201 });
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
    const httpError = toHttpError(error, "Failed to create loan plan.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
