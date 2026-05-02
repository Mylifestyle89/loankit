import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as XLSX from "xlsx";
import { toHttpError } from "@/core/errors/app-error";
import { requireEditorOrAdmin, handleAuthError } from "@/lib/auth-guard";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

/**
 * POST /api/loan-plans/[id]/ai-analyze
 * Upload XLSX → AI extracts cost items, revenue items, loan info
 * Request: FormData with file "xlsxFile"
 * Response: { ok, costItems, revenueItems, name, loanAmount, loanMonths }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params;
  if (!planId) {
    return NextResponse.json({ ok: false, error: "Missing planId" }, { status: 400 });
  }

  try {
    await requireEditorOrAdmin();
    const rl = checkRateLimit(`ai-analyze:${getClientIp(request)}`, 10, 60_000);
    if (!rl.allowed) return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "GEMINI_API_KEY chưa cấu hình" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("xlsxFile") as File | null;
    if (!file) {
      return NextResponse.json({ ok: false, error: "Thiếu file XLSX" }, { status: 400 });
    }

    // Parse XLSX to text representation
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetsText = workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet, { FS: "\t", RS: "\n" });
      return `=== Sheet: ${sheetName} ===\n${csv}`;
    }).join("\n\n");

    // Send to Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: "v1beta" });

    const prompt = `Bạn là chuyên gia phân tích tài chính ngân hàng Agribank. Phân tích dữ liệu XLSX sau và trích xuất thông tin phương án vay vốn.

Dữ liệu XLSX:
${sheetsText.slice(0, 15000)}

Trả về JSON (không markdown, không \`\`\`) theo format:
{
  "name": "Tên phương án (tóm tắt mục đích vay)",
  "loanAmount": 0,
  "loanMonths": 12,
  "costItems": [
    {"name": "Tên hạng mục chi phí", "unit": "ĐVT", "qty": 1, "unitPrice": 0, "amount": 0}
  ],
  "revenueItems": [
    {"description": "Mô tả nguồn doanh thu", "unit": "ĐVT (kg/con/đ)", "qty": 1, "unitPrice": 0, "amount": 0}
  ]
}

Quy tắc:
- costItems: liệt kê TẤT CẢ chi phí trực tiếp (giống, phân bón, thuốc, nhân công, vật tư, ...)
- revenueItems: doanh thu dự kiến từ bán sản phẩm/dịch vụ
- amount = qty * unitPrice (tính toán chính xác)
- Đơn vị tiền: VND (không viết tắt triệu/tỷ, dùng số đầy đủ)
- Nếu không tìm thấy thông tin, để mảng rỗng []
- loanAmount: số tiền vay (VND)
- loanMonths: thời hạn vay (tháng)`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Parse JSON from response (strip markdown fences if any)
    const jsonStr = text.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(jsonStr) as {
      name?: string;
      loanAmount?: number;
      loanMonths?: number;
      costItems?: { name: string; unit: string; qty: number; unitPrice: number; amount: number }[];
      revenueItems?: { description: string; unit?: string; qty: number; unitPrice: number; amount: number }[];
    };

    return NextResponse.json({
      ok: true,
      name: parsed.name ?? "",
      loanAmount: parsed.loanAmount ?? 0,
      loanMonths: parsed.loanMonths ?? 12,
      costItems: parsed.costItems ?? [],
      revenueItems: parsed.revenueItems ?? [],
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error("[AI Analyze]", error);
    const httpError = toHttpError(error, "AI analysis failed.");
    return NextResponse.json({ ok: false, error: httpError.message }, { status: httpError.status });
  }
}
