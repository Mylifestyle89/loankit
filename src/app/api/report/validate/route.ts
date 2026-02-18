import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { runBuildAndValidate } from "@/lib/report/pipeline-client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { run_build?: boolean };
    if (body.run_build === true) {
      const result = await runBuildAndValidate();
      return NextResponse.json({
        ok: true,
        source: "pipeline",
        validation: result.validation,
      });
    }

    const file = path.join(process.cwd(), "report_assets/validation_report.json");
    const raw = await fs.readFile(file, "utf-8");
    return NextResponse.json({
      ok: true,
      source: "cached",
      validation: JSON.parse(raw),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Validate failed." },
      { status: 500 },
    );
  }
}
