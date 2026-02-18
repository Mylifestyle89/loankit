import { NextResponse } from "next/server";

import { logRun, runBuildAndValidate } from "@/lib/report/pipeline-client";

export const runtime = "nodejs";

export async function POST() {
  const start = Date.now();
  try {
    const result = await runBuildAndValidate();
    const durationMs = Date.now() - start;
    await logRun({
      resultSummary: {
        step: "build_validate",
        validation: result.validation,
      },
      outputPaths: [
        "report_assets/report_draft.json",
        "report_assets/report_draft_flat.json",
        "report_assets/validation_report.json",
      ],
      durationMs,
    });
    return NextResponse.json({
      ok: true,
      duration_ms: durationMs,
      command: result.command,
      validation: result.validation,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Build failed." },
      { status: 500 },
    );
  }
}
