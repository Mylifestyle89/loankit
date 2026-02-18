import { NextRequest, NextResponse } from "next/server";

import { fieldCatalogItemSchema } from "@/lib/report/config-schema";
import { loadState, saveState } from "@/lib/report/fs-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const state = await loadState();
    return NextResponse.json({ ok: true, field_catalog: state.field_catalog });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load field catalog." },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as { field_catalog?: unknown[] };
    if (!Array.isArray(body.field_catalog)) {
      return NextResponse.json({ ok: false, error: "field_catalog must be an array." }, { status: 400 });
    }
    const parsed = body.field_catalog.map((item) => fieldCatalogItemSchema.parse(item));
    const state = await loadState();
    state.field_catalog = parsed;
    await saveState(state);
    return NextResponse.json({ ok: true, field_catalog: parsed });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to save field catalog." },
      { status: 400 },
    );
  }
}
