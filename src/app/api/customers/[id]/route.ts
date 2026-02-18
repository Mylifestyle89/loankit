import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";

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
  data_json: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return NextResponse.json(
        { ok: false, error: "Customer not found." },
        { status: 404 },
      );
    }
    const payload = {
      ...customer,
      data_json:
        customer.data_json != null
          ? (JSON.parse(customer.data_json) as Record<string, unknown>)
          : {},
    };
    return NextResponse.json({ ok: true, customer: payload });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to get customer.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateCustomerSchema.parse(body);
    const data: {
      customer_code?: string;
      customer_name?: string;
      address?: string | null;
      main_business?: string | null;
      charter_capital?: number | null;
      legal_representative_name?: string | null;
      legal_representative_title?: string | null;
      organization_type?: string | null;
      data_json?: string;
    } = {};
    if (parsed.customer_code != null) data.customer_code = parsed.customer_code;
    if (parsed.customer_name != null) data.customer_name = parsed.customer_name;
    if (parsed.address !== undefined) data.address = parsed.address;
    if (parsed.main_business !== undefined)
      data.main_business = parsed.main_business;
    if (parsed.charter_capital !== undefined)
      data.charter_capital = parsed.charter_capital;
    if (parsed.legal_representative_name !== undefined)
      data.legal_representative_name = parsed.legal_representative_name;
    if (parsed.legal_representative_title !== undefined)
      data.legal_representative_title = parsed.legal_representative_title;
    if (parsed.organization_type !== undefined)
      data.organization_type = parsed.organization_type;
    if (parsed.data_json !== undefined)
      data.data_json = JSON.stringify(parsed.data_json);
    const customer = await prisma.customer.update({
      where: { id },
      data,
    });
    return NextResponse.json({ ok: true, customer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to update customer.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to delete customer.",
      },
      { status: 500 },
    );
  }
}
