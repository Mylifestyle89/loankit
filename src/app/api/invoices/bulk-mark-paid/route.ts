import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ValidationError } from "@/core/errors/app-error";
import { invoiceService } from "@/services/invoice.service";

export const runtime = "nodejs";

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids } = bodySchema.parse(body);
    const result = await invoiceService.bulkMarkPaid(ids);
    return NextResponse.json({ ok: true, count: result.count });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const ve = new ValidationError("Invalid request body.", error.flatten().fieldErrors);
      return NextResponse.json({ ok: false, error: ve.message, details: ve.details }, { status: ve.status });
    }
    return NextResponse.json({ ok: false, error: "Failed to bulk mark paid." }, { status: 500 });
  }
}
