import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const FIELD_TO_COLUMN: Record<string, string> = {
  "A.general.customer_name": "customer_name",
  "A.general.customer_code": "customer_code",
  "A.general.address": "address",
  "A.general.main_business": "main_business",
  "A.general.charter_capital": "charter_capital",
  "A.general.legal_representative_name": "legal_representative_name",
  "A.general.legal_representative_title": "legal_representative_title",
  "A.general.organization_type": "organization_type",
};

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    if (cleaned === "") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { values?: Record<string, unknown> };
    const values = body.values ?? {};
    const customer_name = toString(values["A.general.customer_name"]);
    const customer_code = toString(values["A.general.customer_code"]);

    if (!customer_name || customer_name.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Tên khách hàng (A.general.customer_name) không được để trống." },
        { status: 400 },
      );
    }

    const payload = {
      customer_code: customer_code ?? customer_name,
      customer_name,
      address: toString(values["A.general.address"]),
      main_business: toString(values["A.general.main_business"]),
      charter_capital: toNumber(values["A.general.charter_capital"]),
      legal_representative_name: toString(values["A.general.legal_representative_name"]),
      legal_representative_title: toString(values["A.general.legal_representative_title"]),
      organization_type: toString(values["A.general.organization_type"]),
    };

    const data_json: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values)) {
      if (key in FIELD_TO_COLUMN) continue;
      data_json[key] = value;
    }

    const existing = await prisma.customer.findFirst({
      where: { customer_name: payload.customer_name },
      orderBy: { updatedAt: "desc" },
    });

    if (existing) {
      const customer = await prisma.customer.update({
        where: { id: existing.id },
        data: {
          customer_code: payload.customer_code,
          address: payload.address,
          main_business: payload.main_business,
          charter_capital: payload.charter_capital,
          legal_representative_name: payload.legal_representative_name,
          legal_representative_title: payload.legal_representative_title,
          organization_type: payload.organization_type,
          data_json: JSON.stringify(data_json),
        },
      });
      return NextResponse.json({
        ok: true,
        customer,
        created: false,
        message: "Đã cập nhật khách hàng theo tên.",
      });
    }

    const customer = await prisma.customer.create({
      data: {
        customer_code: payload.customer_code,
        customer_name: payload.customer_name,
        address: payload.address,
        main_business: payload.main_business,
        charter_capital: payload.charter_capital,
        legal_representative_name: payload.legal_representative_name,
        legal_representative_title: payload.legal_representative_title,
        organization_type: payload.organization_type,
        data_json: JSON.stringify(data_json),
      },
    });
    return NextResponse.json({
      ok: true,
      customer,
      created: true,
      message: "Đã tạo khách hàng mới.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to save customer from draft.",
      },
      { status: 500 },
    );
  }
}
