import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const FIELD_TO_COLUMN: Record<string, string> = {
  customer_name: "A.general.customer_name",
  customer_code: "A.general.customer_code",
  address: "A.general.address",
  main_business: "A.general.main_business",
  charter_capital: "A.general.charter_capital",
  legal_representative_name: "A.general.legal_representative_name",
  legal_representative_title: "A.general.legal_representative_title",
  organization_type: "A.general.organization_type",
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { customer_id?: string; customer_name?: string };
    const { customer_id, customer_name } = body;

    if (!customer_id && !customer_name) {
      return NextResponse.json(
        { ok: false, error: "customer_id hoặc customer_name phải được cung cấp." },
        { status: 400 },
      );
    }

    const customer = customer_id
      ? await prisma.customer.findUnique({ where: { id: customer_id } })
      : await prisma.customer.findFirst({
          where: { customer_name },
          orderBy: { updatedAt: "desc" },
        });

    if (!customer) {
      return NextResponse.json({ ok: false, error: "Không tìm thấy khách hàng." }, { status: 404 });
    }

    // Convert customer data to values format
    const values: Record<string, unknown> = {};

    // Map standard fields
    if (customer.customer_name) values[FIELD_TO_COLUMN.customer_name] = customer.customer_name;
    if (customer.customer_code) values[FIELD_TO_COLUMN.customer_code] = customer.customer_code;
    if (customer.address) values[FIELD_TO_COLUMN.address] = customer.address;
    if (customer.main_business) values[FIELD_TO_COLUMN.main_business] = customer.main_business;
    if (customer.charter_capital != null) values[FIELD_TO_COLUMN.charter_capital] = customer.charter_capital;
    if (customer.legal_representative_name)
      values[FIELD_TO_COLUMN.legal_representative_name] = customer.legal_representative_name;
    if (customer.legal_representative_title)
      values[FIELD_TO_COLUMN.legal_representative_title] = customer.legal_representative_title;
    if (customer.organization_type) values[FIELD_TO_COLUMN.organization_type] = customer.organization_type;

    // Add extra fields from data_json
    if (customer.data_json) {
      try {
        const extraData = JSON.parse(customer.data_json) as Record<string, unknown>;
        Object.assign(values, extraData);
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    return NextResponse.json({
      ok: true,
      customer,
      values,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load customer data.",
      },
      { status: 500 },
    );
  }
}
