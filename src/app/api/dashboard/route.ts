import { NextResponse } from "next/server";
import { requireSession, handleAuthError } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

/** GET /api/dashboard — aggregate stats for dashboard page */
export async function GET() {
  try {
    await requireSession();
    const [customerCount, loanCount, invoicePendingCount] = await Promise.all([
      prisma.customer.count(),
      prisma.loan.count(),
      prisma.invoice.count({ where: { status: "pending" } }),
    ]);

    return NextResponse.json({
      ok: true,
      stats: { customerCount, loanCount, invoicePendingCount },
    });
  } catch (e: unknown) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
