import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { customerService } from "@/services/customer.service";
import { requireAdmin, handleAuthError } from "@/lib/auth-guard";

export const runtime = "nodejs";

const updateCustomerSchema = z.object({
  customer_code: z.string().min(1).optional(),
  customer_name: z.string().min(1).optional(),
  address: z.string().optional().nullable(),
  main_business: z.string().optional().nullable(),
  charter_capital: z.number().optional().nullable(),
  legal_representative_name: z.string().optional().nullable(),
  legal_representative_title: z.string().optional().nullable(),
  organization_type: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  data_json: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const full = req.nextUrl.searchParams.get("full") === "true";

    if (full) {
      const profile = await customerService.getFullProfile(id);
      return NextResponse.json({ ok: true, customer: profile });
    }

    const customer = await customerService.getCustomerById(id);
    const payload = {
      ...customer,
      data_json:
        customer.data_json != null
          ? (JSON.parse(customer.data_json) as Record<string, unknown>)
          : {},
    };
    return NextResponse.json({ ok: true, customer: payload });
  } catch (error) {
    const httpError = toHttpError(error, "Failed to get customer.");
    return NextResponse.json(
      {
        ok: false,
        error: httpError.message,
      },
      { status: httpError.status },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateCustomerSchema.parse(body);
    const customer = await customerService.updateCustomer(id, {
      customer_code: parsed.customer_code,
      customer_name: parsed.customer_name,
      address: parsed.address,
      main_business: parsed.main_business,
      charter_capital: parsed.charter_capital,
      legal_representative_name: parsed.legal_representative_name,
      legal_representative_title: parsed.legal_representative_title,
      organization_type: parsed.organization_type,
      email: parsed.email,
      data_json: parsed.data_json,
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
    console.error("[api/customers/PATCH] Error:", error);
    const httpError = toHttpError(error, "Failed to update customer.");
    return NextResponse.json(
      {
        ok: false,
        error: httpError.message,
      },
      { status: httpError.status },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await customerService.deleteCustomer(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to delete customer.");
    return NextResponse.json(
      {
        ok: false,
        error: httpError.message,
      },
      { status: httpError.status },
    );
  }
}
