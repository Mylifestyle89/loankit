import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { requireSession, requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { fieldCatalogItemSchema } from "@/lib/report/config-schema";
import { loadState, saveState } from "@/lib/report/fs-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireSession();
    const state = await loadState();
    return NextResponse.json({ ok: true, field_catalog: state.field_catalog });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to load field catalog.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireEditorOrAdmin();
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
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    if (error instanceof z.ZodError) {
      const ve = new ValidationError("Định dạng field catalog không hợp lệ.", error.flatten().fieldErrors);
      return NextResponse.json({ ok: false, error: ve.message, details: ve.details }, { status: ve.status });
    }
    const httpError = toHttpError(error, "Failed to save field catalog.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
