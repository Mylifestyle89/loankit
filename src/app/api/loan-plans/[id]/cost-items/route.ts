import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireSession, handleAuthError } from "@/lib/auth-guard";
import { checkCustomerAccess } from "@/services/customer-access.service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** GET /api/loan-plans/[id]/cost-items — return PA cost items for retail invoice pre-fill */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const plan = await prisma.loanPlan.findUnique({
      where: { id },
      select: { customerId: true, cost_items_json: true },
    });
    if (!plan) return NextResponse.json({ ok: false, error: "Loan plan not found" }, { status: 404 });

    if (session.user.role !== "admin") {
      const ok = await checkCustomerAccess(plan.customerId, session.user.id);
      if (!ok) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const costItems = JSON.parse(plan.cost_items_json ?? "[]");
    return NextResponse.json({ ok: true, costItems });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to fetch cost items.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
