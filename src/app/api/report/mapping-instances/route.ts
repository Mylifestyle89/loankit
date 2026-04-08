import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError } from "@/core/errors/app-error";
import { withValidatedBody } from "@/lib/api-helpers";
import { withErrorHandling } from "@/lib/api/with-error-handling";
import { reportService } from "@/services/report.service";
import { requireSession, requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const customerId = req.nextUrl.searchParams.get("customer_id") ?? undefined;
    const masterId = req.nextUrl.searchParams.get("master_id") ?? undefined;
    const statusRaw = req.nextUrl.searchParams.get("status") ?? undefined;
    const status =
      statusRaw === "draft" || statusRaw === "published" || statusRaw === "archived"
        ? statusRaw
        : undefined;
    const instances = await reportService.listMappingInstances({ customerId, masterId, status });
    return NextResponse.json({ ok: true, mapping_instances: instances });
  } catch (error) {
    const authResp = handleAuthError(error);
    if (authResp) return authResp;
    const httpError = toHttpError(error, "Failed to load mapping instances.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

const mappingInstancesPostSchema = z.object({
  master_id: z.string().min(1),
  customer_id: z.string().min(1),
  name: z.string().optional(),
  created_by: z.string().optional(),
});

export const POST = withErrorHandling(
  withValidatedBody(mappingInstancesPostSchema, async (body) => {
    const session = await requireEditorOrAdmin();
    const mappingInstance = await reportService.createMappingInstance({
      masterId: body.master_id,
      customerId: body.customer_id,
      name: body.name,
      createdBy: session.user.id,
    });
    return NextResponse.json({ ok: true, mapping_instance: mappingInstance });
  }),
);
