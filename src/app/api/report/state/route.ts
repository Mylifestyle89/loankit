import { NextResponse } from "next/server";

import { loadState } from "@/lib/report/fs-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const state = await loadState();
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load state.",
      },
      { status: 500 },
    );
  }
}
