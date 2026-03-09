import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { customerService } from "@/services/customer.service";
import { requireAdmin, handleAuthError } from "@/lib/auth-guard";

export const runtime = "nodejs";

const createCustomerSchema = z.object({
  customer_code: z.string().min(1),
  customer_name: z.string().min(1),
  address: z.string().optional(),
  main_business: z.string().optional(),
  charter_capital: z.number().optional(),
  legal_representative_name: z.string().optional(),
  legal_representative_title: z.string().optional(),
  organization_type: z.string().optional(),
  data_json: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  try {
    const customers = await customerService.listCustomers();
    return NextResponse.json({ ok: true, customers });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to list customers.");
    return NextResponse.json(
      {
        ok: false,
        error: httpError.message,
      },
      { status: httpError.status },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = createCustomerSchema.parse(body);
    const customer = await customerService.createCustomer({
      customer_code: parsed.customer_code,
      customer_name: parsed.customer_name,
      address: parsed.address ?? null,
      main_business: parsed.main_business ?? null,
      charter_capital: parsed.charter_capital ?? null,
      legal_representative_name: parsed.legal_representative_name ?? null,
      legal_representative_title: parsed.legal_representative_title ?? null,
      organization_type: parsed.organization_type ?? null,
      data_json: parsed.data_json ?? {},
    });
    return NextResponse.json({ ok: true, customer });
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
    const httpError = toHttpError(error, "Failed to create customer.");
    return NextResponse.json(
      {
        ok: false,
        error: httpError.message,
      },
      { status: httpError.status },
    );
  }
}
