import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireSession, handleAuthError } from "@/lib/auth-guard";
import { customerService } from "@/services/customer.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = (await req.json()) as { customer_id?: string; customer_name?: string };
    const result = await customerService.toDraft({
      customerId: body.customer_id,
      customerName: body.customer_name,
    });

    return NextResponse.json({
      ok: true,
      customer: result.customer,
      values: result.values,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to load customer data.");
    return NextResponse.json(
      {
        ok: false,
        error: httpError.message,
      },
      { status: httpError.status },
    );
  }
}
