import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";

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
    const customers = await prisma.customer.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ ok: true, customers });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to list customers.",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createCustomerSchema.parse(body);
    const data_json =
      parsed.data_json != null ? JSON.stringify(parsed.data_json) : "{}";
    const customer = await prisma.customer.create({
      data: {
        customer_code: parsed.customer_code,
        customer_name: parsed.customer_name,
        address: parsed.address ?? null,
        main_business: parsed.main_business ?? null,
        charter_capital: parsed.charter_capital ?? null,
        legal_representative_name: parsed.legal_representative_name ?? null,
        legal_representative_title: parsed.legal_representative_title ?? null,
        organization_type: parsed.organization_type ?? null,
        data_json,
      },
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
        error: error instanceof Error ? error.message : "Failed to create customer.",
      },
      { status: 500 },
    );
  }
}
