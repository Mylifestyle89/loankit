import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireAdmin, handleAuthError } from "@/lib/auth-guard";

export const runtime = "nodejs";

/**
 * POST /api/loan-plans/[id]/ai-credit-assessment
 * AI generates 6 credit assessment fields based on loan plan context.
 * Request body: { name, costItems, revenueItems, financials }
 * Response: { ok, assessment: { legal, marketInput, marketOutput, labor, machinery, other } }
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "GEMINI_API_KEY chưa cấu hình" }, { status: 500 });
    }

    const body = await req.json();
    const { name, costItems, revenueItems, financials } = body;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Build context strings outside template literal to avoid nested backtick issues
    const fmt = (n: number) => (n || 0).toLocaleString("vi-VN");
    type CI = { name: string; unit: string; amount: number };
    type RI = { description: string; amount: number };
    const costStr = costItems?.length
      ? (costItems as CI[]).map((c) => c.name + " (" + c.unit + "): " + fmt(c.amount) + "đ").join(", ")
      : "Không có";
    const revStr = revenueItems?.length
      ? (revenueItems as RI[]).map((r) => r.description + ": " + fmt(r.amount) + "đ").join(", ")
      : "Không có";
    const fin = financials || {};
    const rateStr = fin.interestRate ? ((fin.interestRate as number) * 100).toFixed(1) + "%/năm" : "Không rõ";

    const prompt = [
      "Bạn là chuyên viên tín dụng ngân hàng Agribank. Dựa trên phương án vay vốn bên dưới, hãy viết đánh giá ĐỊNH TÍNH TÍCH CỰC cho 6 tiêu chí. KHÔNG nêu số liệu cụ thể (tiền, lãi suất, diện tích, sản lượng). Chỉ nhận xét chung về tính khả thi, hợp lệ, ổn định. Viết bằng tiếng Việt, giọng chuyên nghiệp, khẳng định. KHÔNG kiến nghị, đề nghị, yêu cầu bổ sung.",
      "",
      "PHƯƠNG ÁN VAY VỐN:",
      "- Tên: " + (name || "Không rõ"),
      "- Chi phí: " + costStr,
      "- Doanh thu: " + revStr,
      "- Số tiền vay: " + fmt(fin.loanAmount as number) + "đ",
      "- Lãi suất: " + rateStr,
      "- Thời hạn: " + (fin.term_months || "Không rõ") + " tháng",
      "- Đơn giá tài sản: " + fmt(fin.asset_unit_price as number) + "đ",
      "- Diện tích: " + (fin.land_area_sau || 0) + " sào",
      "- Số HĐ thi công: " + (fin.construction_contract_no || "Không có"),
      "- Địa chỉ: " + (fin.farmAddress || "Không rõ"),
      "",
      "6 TIÊU CHÍ CẦN ĐÁNH GIÁ:",
      '1. legal: Xem xét cơ sở pháp lý — mục đích vay có phù hợp quy định pháp luật và Agribank không, khách hàng canh tác trên đất NN tại địa chỉ nào, diện tích bao nhiêu, nhu cầu vay để làm gì.',
      '2. marketInput: Thị trường đầu vào — nguồn cung giống, phân bón, thuốc BVTV từ đâu, có hợp đồng đầu vào không, quan hệ với nhà cung cấp.',
      '3. marketOutput: Thị trường tiêu thụ — KH có bạn hàng ổn định không, sản phẩm bán cho ai, ở đâu, có hợp đồng tiêu thụ không, lý do nếu không có.',
      '4. labor: Nhân công — ai trực tiếp sản xuất (vợ chồng KH, lao động thuê), có kinh nghiệm không, đảm bảo hoạt động SX.',
      '5. machinery: Máy móc, công nghệ — hệ thống tưới tiêu, chiếu sáng, nhà kính, trang thiết bị phục vụ SX.',
      '6. other: Yếu tố khác — kinh nghiệm KH, khả năng trả nợ, rủi ro.',
      "",
      "Trả về JSON thuần (KHÔNG markdown, KHÔNG code block, KHÔNG xuống dòng trong value) với đúng 6 key:",
      '{"legal":"...","marketInput":"...","marketOutput":"...","labor":"...","machinery":"...","other":"..."}',
    ].join("\n");

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ ok: false, error: "AI không trả về JSON hợp lệ" }, { status: 500 });
    }

    // Sanitize: remove control chars, fix trailing commas before closing brace
    const cleaned = jsonMatch[0]
      .replace(/[\x00-\x1f]/g, " ")       // control chars → space
      .replace(/,\s*}/g, "}")             // trailing comma
      .replace(/,\s*]/g, "]");            // trailing comma in arrays
    const assessment = JSON.parse(cleaned);
    return NextResponse.json({ ok: true, assessment });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    console.error("[AI Credit Assessment]", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "AI phân tích thất bại" },
      { status: 500 },
    );
  }
}
