import { NextRequest, NextResponse } from "next/server";

import { toHttpError } from "@/core/errors/app-error";
import { requireSession, handleAuthError } from "@/lib/auth-guard";
import {
  collectDigestItems,
  type DigestItemType,
} from "@/lib/notifications/collect-digest-items";
import { buildOverdueXlsxBuffer } from "@/services/invoice-overdue-xlsx-export.service";

export const runtime = "nodejs";

const VALID_TYPES: DigestItemType[] = ["overdue", "dueSoon", "supplement"];
const MAX_CUSTOMER_IDS = 500;

function parseCsv(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseTypes(value: string | null): DigestItemType[] | undefined {
  const raw = parseCsv(value);
  if (raw.length === 0) return undefined;
  const valid = raw.filter((t): t is DigestItemType =>
    (VALID_TYPES as string[]).includes(t),
  );
  return valid.length > 0 ? valid : undefined;
}

function buildFilename(now: Date): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `no-chung-tu-${yyyy}${mm}${dd}.xlsx`;
}

export async function GET(req: NextRequest) {
  try {
    await requireSession();

    const params = req.nextUrl.searchParams;
    const customerIds = parseCsv(params.get("customerIds")).slice(0, MAX_CUSTOMER_IDS);
    const types = parseTypes(params.get("types"));

    const snapshot = await collectDigestItems({
      customerIds: customerIds.length > 0 ? customerIds : undefined,
      types,
    });

    const buffer = buildOverdueXlsxBuffer(snapshot);
    const body = new Uint8Array(buffer);
    const filename = buildFilename(new Date());

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    const httpError = toHttpError(error, "Failed to export overdue invoices.");
    return NextResponse.json(
      { ok: false, error: httpError.message },
      { status: httpError.status },
    );
  }
}
