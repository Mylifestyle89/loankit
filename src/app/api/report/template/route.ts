import { NextRequest, NextResponse } from "next/server";

import { loadState, setActiveTemplate } from "@/lib/report/fs-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const state = await loadState();
    return NextResponse.json({
      ok: true,
      templates: state.template_profiles,
      active_template_id: state.active_template_id,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load templates." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { template_id?: string };
    if (!body.template_id) {
      return NextResponse.json({ ok: false, error: "template_id is required." }, { status: 400 });
    }
    const state = await setActiveTemplate(body.template_id);
    return NextResponse.json({
      ok: true,
      templates: state.template_profiles,
      active_template_id: state.active_template_id,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to set active template." },
      { status: 400 },
    );
  }
}
