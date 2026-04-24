import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { maskCustomerResponse } from "@/lib/field-encryption";
import { customerService } from "@/services/customer.service";
import { requireSession, requireAdmin, requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";

export const runtime = "nodejs";

const createCustomerSchema = z.object({
  customer_code: z.string().min(1),
  customer_name: z.string().min(1),
  customer_type: z.enum(["corporate", "individual"]).optional(),
  address: z.string().nullable().optional(),
  main_business: z.string().nullable().optional(),
  charter_capital: z.number().nullable().optional(),
  legal_representative_name: z.string().nullable().optional(),
  legal_representative_title: z.string().nullable().optional(),
  organization_type: z.string().nullable().optional(),
  // Individual PII columns — stored as real columns (encrypted via service),
  // not stuffed into data_json. Keeping them nullable + optional so partial
  // imports (e.g. DOCX with only name + CCCD) still validate.
  cccd: z.string().nullable().optional(),
  cccd_old: z.string().nullable().optional(),
  cccd_issued_date: z.string().nullable().optional(),
  cccd_issued_place: z.string().nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  // email: Gemini may emit garbage on OCR'd docs, so accept loose strings
  // and let the frontend fix invalids — full email validation is enforced
  // on PATCH where users can correct the value manually.
  email: z.string().nullable().optional(),
  bank_account: z.string().nullable().optional(),
  bank_name: z.string().nullable().optional(),
  marital_status: z.string().nullable().optional(),
  spouse_name: z.string().nullable().optional(),
  spouse_cccd: z.string().nullable().optional(),
  data_json: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const isAdmin = session.user.role === "admin";
    const rawType = req.nextUrl.searchParams.get("type");
    const type = rawType === "corporate" || rawType === "individual" ? rawType : undefined;
    const page = Number(req.nextUrl.searchParams.get("page")) || 1;
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 50;
    const result = await customerService.listCustomers({ customer_type: type, page, limit, userId: session.user.id, isAdmin });
    // Mask PII in list responses (no reveal in list view)
    const maskedCustomers = result.data.map((c) => maskCustomerResponse(c));
    return NextResponse.json({ ok: true, customers: maskedCustomers, total: result.total, page: result.page, limit: result.limit });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
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
    const session = await requireEditorOrAdmin();
    const body = await req.json();
    const parsed = createCustomerSchema.parse(body);
    const customer = await customerService.createCustomer({
      createdById: session.user.id,
      customer_code: parsed.customer_code,
      customer_name: parsed.customer_name,
      customer_type: parsed.customer_type,
      address: parsed.address ?? null,
      main_business: parsed.main_business ?? null,
      charter_capital: parsed.charter_capital ?? null,
      legal_representative_name: parsed.legal_representative_name ?? null,
      legal_representative_title: parsed.legal_representative_title ?? null,
      organization_type: parsed.organization_type ?? null,
      cccd: parsed.cccd ?? null,
      cccd_old: parsed.cccd_old ?? null,
      cccd_issued_date: parsed.cccd_issued_date ?? null,
      cccd_issued_place: parsed.cccd_issued_place ?? null,
      date_of_birth: parsed.date_of_birth ?? null,
      gender: parsed.gender ?? null,
      phone: parsed.phone ?? null,
      email: parsed.email ?? null,
      bank_account: parsed.bank_account ?? null,
      bank_name: parsed.bank_name ?? null,
      marital_status: parsed.marital_status ?? null,
      spouse_name: parsed.spouse_name ?? null,
      spouse_cccd: parsed.spouse_cccd ?? null,
      data_json: parsed.data_json ?? {},
    });
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
