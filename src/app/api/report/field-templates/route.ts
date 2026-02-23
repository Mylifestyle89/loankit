import { NextRequest, NextResponse } from "next/server";

import { fieldCatalogItemSchema } from "@/lib/report/config-schema";
import { prisma } from "@/lib/db";
import { loadState, saveState } from "@/lib/report/fs-store";

export const runtime = "nodejs";

function parseCustomerDataJson(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get("customer_id") ?? "";
    const withUsage = req.nextUrl.searchParams.get("with_usage") === "1";
    const state = await loadState();
    const allTemplates = state.field_templates ?? [];

    if (!customerId) {
      if (withUsage) {
        const customers = await prisma.customer.findMany({
          select: { data_json: true },
        });
        const usageMap = new Map<string, number>();
        for (const customer of customers) {
          const dataJson = parseCustomerDataJson(customer.data_json);
          const assignedIdsRaw = dataJson.__field_template_ids;
          const assignedIds = Array.isArray(assignedIdsRaw) ? assignedIdsRaw.map(String) : [];
          for (const id of assignedIds) {
            usageMap.set(id, (usageMap.get(id) ?? 0) + 1);
          }
        }
        const templatesWithUsage = allTemplates.map((template) => ({
          ...template,
          assigned_customer_count: usageMap.get(template.id) ?? 0,
        }));
        return NextResponse.json({ ok: true, field_templates: templatesWithUsage });
      }
      return NextResponse.json({ ok: true, field_templates: allTemplates });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ ok: true, field_templates: [] });
    }

    const dataJson = parseCustomerDataJson(customer.data_json);
    const assignedIdsRaw = dataJson.__field_template_ids;
    const assignedIds = Array.isArray(assignedIdsRaw) ? assignedIdsRaw.map(String) : [];
    const filtered = allTemplates.filter((template) => assignedIds.includes(template.id));
    return NextResponse.json({ ok: true, field_templates: filtered });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load field templates." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { name?: string; field_catalog?: unknown[]; customer_id?: string };
    const name = (body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: "Template name is required." }, { status: 400 });
    }
    if (!Array.isArray(body.field_catalog)) {
      return NextResponse.json({ ok: false, error: "field_catalog must be an array." }, { status: 400 });
    }

    const parsedCatalog = body.field_catalog.map((item) => fieldCatalogItemSchema.parse(item));
    const template = {
      id: `field-template-${Date.now()}`,
      name,
      created_at: new Date().toISOString(),
      field_catalog: parsedCatalog,
    };

    const state = await loadState();
    state.field_templates = [template, ...(state.field_templates ?? [])];
    await saveState(state);

    if (body.customer_id) {
      const customer = await prisma.customer.findUnique({ where: { id: body.customer_id } });
      if (customer) {
        const dataJson = parseCustomerDataJson(customer.data_json);
        const assignedIdsRaw = dataJson.__field_template_ids;
        const assignedIds = Array.isArray(assignedIdsRaw) ? assignedIdsRaw.map(String) : [];
        if (!assignedIds.includes(template.id)) {
          assignedIds.push(template.id);
        }
        dataJson.__field_template_ids = assignedIds;
        await prisma.customer.update({
          where: { id: customer.id },
          data: { data_json: JSON.stringify(dataJson) },
        });
      }
    }

    return NextResponse.json({ ok: true, field_template: template, field_templates: state.field_templates });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to create field template." },
      { status: 400 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { customer_id?: string; template_id?: string };
    const customerId = (body.customer_id ?? "").trim();
    const templateId = (body.template_id ?? "").trim();
    if (!customerId || !templateId) {
      return NextResponse.json({ ok: false, error: "customer_id and template_id are required." }, { status: 400 });
    }

    const state = await loadState();
    const template = (state.field_templates ?? []).find((item) => item.id === templateId);
    if (!template) {
      return NextResponse.json({ ok: false, error: "Field template not found." }, { status: 404 });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ ok: false, error: "Customer not found." }, { status: 404 });
    }

    const dataJson = parseCustomerDataJson(customer.data_json);
    const assignedIdsRaw = dataJson.__field_template_ids;
    const assignedIds = Array.isArray(assignedIdsRaw) ? assignedIdsRaw.map(String) : [];
    if (!assignedIds.includes(template.id)) {
      assignedIds.push(template.id);
    }
    dataJson.__field_template_ids = assignedIds;

    await prisma.customer.update({
      where: { id: customer.id },
      data: { data_json: JSON.stringify(dataJson) },
    });

    return NextResponse.json({ ok: true, template_id: template.id, customer_id: customer.id });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to attach field template." },
      { status: 400 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      template_id?: string;
      name?: string;
      field_catalog?: unknown[];
    };
    const templateId = (body.template_id ?? "").trim();
    if (!templateId) {
      return NextResponse.json({ ok: false, error: "template_id is required." }, { status: 400 });
    }
    if (!Array.isArray(body.field_catalog)) {
      return NextResponse.json({ ok: false, error: "field_catalog must be an array." }, { status: 400 });
    }

    const nextName = (body.name ?? "").trim();
    const parsedCatalog = body.field_catalog.map((item) => fieldCatalogItemSchema.parse(item));

    const state = await loadState();
    const current = (state.field_templates ?? []).find((item) => item.id === templateId);
    if (!current) {
      return NextResponse.json({ ok: false, error: "Field template not found." }, { status: 404 });
    }

    state.field_templates = (state.field_templates ?? []).map((item) =>
      item.id === templateId
        ? {
            ...item,
            name: nextName || item.name,
            field_catalog: parsedCatalog,
          }
        : item,
    );
    await saveState(state);

    const updated = state.field_templates.find((item) => item.id === templateId);
    return NextResponse.json({ ok: true, field_template: updated, field_templates: state.field_templates });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to update field template." },
      { status: 400 },
    );
  }
}
