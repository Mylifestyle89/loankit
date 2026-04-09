import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { maskCustomerResponse } from "@/lib/field-encryption";
import { customerService } from "@/services/customer.service";
import { requireSession, requireAdmin, requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";

export const runtime = "nodejs";

const updateCustomerSchema = z.object({
  customer_code: z.string().min(1).optional(),
  customer_name: z.string().min(1).optional(),
  customer_type: z.enum(["corporate", "individual"]).optional(),
  address: z.string().optional().nullable(),
  main_business: z.string().optional().nullable(),
  charter_capital: z.number().optional().nullable(),
  legal_representative_name: z.string().optional().nullable(),
  legal_representative_title: z.string().optional().nullable(),
  organization_type: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  active_branch_id: z.string().optional().nullable(),
  relationship_officer: z.string().optional().nullable(),
  appraiser: z.string().optional().nullable(),
  approver_name: z.string().optional().nullable(),
  approver_title: z.string().optional().nullable(),
  cccd: z.string().optional().nullable(),
  cccd_old: z.string().optional().nullable(),
  cccd_issued_date: z.string().optional().nullable(),
  cccd_issued_place: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  bank_account: z.string().optional().nullable(),
  bank_name: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  cic_product_name: z.string().optional().nullable(),
  cic_product_code: z.string().optional().nullable(),
  documents_pa_json: z.string().optional().nullable(),
  data_json: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSession(); // Base read access — logged-in user only
    const { id } = await params;
    const full = req.nextUrl.searchParams.get("full") === "true";
    // ?reveal=all or ?reveal=customer_code,phone,cccd to show raw PII (requires elevated role)
    const revealParam = req.nextUrl.searchParams.get("reveal");
    let revealFields: Set<string> | undefined;
    if (revealParam) {
      await requireEditorOrAdmin(); // PII reveal requires editor+
      revealFields = new Set(revealParam.split(","));
    }

    if (full) {
      const profile = await customerService.getFullProfile(id);
      const masked = maskCustomerResponse(profile, revealFields);
      return NextResponse.json({ ok: true, customer: masked });
    }

    const customer = await customerService.getCustomerById(id);
    const payload = {
      ...customer,
      data_json:
        customer.data_json != null
          ? (JSON.parse(customer.data_json) as Record<string, unknown>)
          : {},
    };
    // Mask PII fields by default, reveal only if explicitly requested
    const masked = maskCustomerResponse(payload, revealFields);
    return NextResponse.json({ ok: true, customer: masked });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
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
    await requireEditorOrAdmin();
    const { id } = await params;
    const body = await req.json();
    const parsed = updateCustomerSchema.parse(body);
    const customer = await customerService.updateCustomer(id, parsed);
    return NextResponse.json({ ok: true, customer: maskCustomerResponse(customer) });
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
