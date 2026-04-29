import { NextRequest, NextResponse } from "next/server";
import { requireEditorOrAdmin } from "@/lib/auth-guard";
import {
  extractCollateralsFromText,
  extractCustomerFromText,
  extractCoBorrowersFromText,
  extractLoanFromText,
  type AiExtractEntityType,
} from "@/services/ai-text-extraction.service";

export const runtime = "nodejs";

/**
 * POST /api/ai/extract-text
 * Focused AI extraction from clipboard-pasted text.
 * body: { entityType: AiExtractEntityType, text: string }
 */
export async function POST(request: NextRequest) {
  try {
    await requireEditorOrAdmin();

    const { entityType, text } = (await request.json()) as { entityType: AiExtractEntityType; text: string };

    if (!text?.trim()) {
      return NextResponse.json({ ok: false, error: "Vui lòng dán nội dung văn bản." }, { status: 400 });
    }

    switch (entityType) {
      case "collateral": {
        const data = await extractCollateralsFromText(text);
        return NextResponse.json({ ok: true, data });
      }
      case "customer": {
        const data = await extractCustomerFromText(text);
        return NextResponse.json({ ok: true, data });
      }
      case "co_borrower": {
        const data = await extractCoBorrowersFromText(text);
        return NextResponse.json({ ok: true, data });
      }
      case "loan": {
        const data = await extractLoanFromText(text);
        return NextResponse.json({ ok: true, data });
      }
      default:
        return NextResponse.json({ ok: false, error: "entityType không hợp lệ." }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi trích xuất AI.";
    console.error("[extract-text]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
