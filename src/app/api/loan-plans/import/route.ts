import { NextRequest, NextResponse } from "next/server";
import { parseXlsxLoanPlan } from "@/lib/import/xlsx-loan-plan-parser";
import { requireAdmin, handleAuthError } from "@/lib/auth-guard";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = [".xlsx", ".xls"];

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "Thiếu file XLSX" }, { status: 400 });
    }

    // Validate extension
    const fileName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    if (!hasValidExt) {
      return NextResponse.json({ ok: false, error: "Chỉ hỗ trợ file .xlsx hoặc .xls" }, { status: 400 });
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ ok: false, error: "File quá lớn (tối đa 5MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate magic bytes: XLSX/XLS are ZIP files starting with PK (0x504B)
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      return NextResponse.json({ ok: false, error: "File không đúng định dạng XLSX" }, { status: 400 });
    }
    const result = parseXlsxLoanPlan(buffer);

    return NextResponse.json({ ok: result.status !== "error", ...result });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error("[Loan Plan Import] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Lỗi khi xử lý file import" },
      { status: 500 },
    );
  }
}
