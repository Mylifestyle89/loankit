import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { toHttpError, ValidationError } from "@/core/errors/app-error";
import { requireSession, requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

const createBranchSchema = z.object({
  name: z.string().min(1).max(200),
  name_uppercase: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  branch_code: z.string().max(50).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  fax: z.string().max(50).optional().nullable(),
  tax_code: z.string().max(50).optional().nullable(),
  tax_issued_date: z.string().max(100).optional().nullable(),
  tax_issued_place: z.string().max(200).optional().nullable(),
  district: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
});

/** GET /api/branches — list all branches */
export async function GET() {
  try {
    await requireSession();
    const items = await prisma.branch.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;
    const httpError = toHttpError(e, "Failed to list branches.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}

/** POST /api/branches — create a branch */
export async function POST(req: NextRequest) {
  try {
    await requireEditorOrAdmin();
    const raw = await req.json().catch(() => {
      throw new ValidationError("Request body phải là JSON hợp lệ.");
    });
    const body = createBranchSchema.parse(raw);
    const item = await prisma.branch.create({
      data: {
        name: body.name.trim(),
        name_uppercase: body.name_uppercase ?? null,
        address: body.address ?? null,
        branch_code: body.branch_code ?? null,
        phone: body.phone ?? null,
        fax: body.fax ?? null,
        tax_code: body.tax_code ?? null,
        tax_issued_date: body.tax_issued_date ?? null,
        tax_issued_place: body.tax_issued_place ?? null,
        district: body.district ?? null,
        province: body.province ?? null,
      },
    });
    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    const authResponse = handleAuthError(e);
    if (authResponse) return authResponse;
    if (e instanceof z.ZodError) {
      const ve = new ValidationError("Dữ liệu branch không hợp lệ.", e.flatten().fieldErrors);
      return NextResponse.json({ ok: false, error: ve.message, details: ve.details }, { status: ve.status });
    }
    const httpError = toHttpError(e, "Failed to create branch.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
