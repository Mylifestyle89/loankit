import { NextResponse } from "next/server";
import { z } from "zod";
import { toHttpError } from "@/core/errors/app-error";
import { requireSession, requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { withValidatedBody } from "@/lib/api-helpers";
import { withErrorHandling } from "@/lib/api/with-error-handling";
import { reportService } from "@/services/report.service";

export const runtime = "nodejs";

/** GET /api/report/snapshots — list all editor snapshots */
export async function GET() {
  try {
    await requireSession();
    const snapshots = await reportService.listSnapshots();
    return NextResponse.json({ ok: true, snapshots });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Không thể liệt kê snapshot.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

const snapshotRepeaterItem = z.record(z.string(), z.unknown());
const snapshotScalarOrArray = z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(snapshotRepeaterItem)]);

const createSnapshotSchema = z.object({
  source: z.enum(["auto", "manual"]).default("auto"),
  manualValues: z.record(z.string(), snapshotScalarOrArray).default({}),
  formulas: z.record(z.string(), z.string()).default({}),
  mappingText: z.string().default("{}"),
  aliasText: z.string().default("{}"),
  fieldCatalogCount: z.number().default(0),
});

/** POST /api/report/snapshots — create a new editor snapshot */
export const POST = withErrorHandling(
  withValidatedBody(createSnapshotSchema, async (body) => {
    await requireEditorOrAdmin();
    const meta = await reportService.createSnapshot(
      {
        manualValues: body.manualValues,
        formulas: body.formulas,
        mappingText: body.mappingText,
        aliasText: body.aliasText,
        fieldCatalogCount: body.fieldCatalogCount,
      },
      body.source,
    );
    return NextResponse.json({ ok: true, snapshot: meta });
  }),
);
