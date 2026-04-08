/**
 * customer-docx-extraction.service.ts
 *
 * AI extraction of customer/loan/collateral data from DOCX document text.
 * Uses Gemini to parse Vietnamese bank loan documents into structured JSON.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { resolveAiProvider } from "@/lib/ai";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExtractedCustomer = {
  customer_name: string;
  customer_code: string;
  cccd: string;
  cccd_old: string;
  cccd_issued_date: string;
  cccd_issued_place: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  address: string;
  email: string;
  bank_account: string;
  bank_name: string;
  marital_status: string;
  spouse_name: string;
  spouse_cccd: string;
};

export type ExtractedLoan = {
  contract_number: string;
  loan_amount: number;
  interest_rate: number;
  purpose: string;
  start_date: string;
  end_date: string;
  loan_method: string;
  lending_method: string;
  principal_schedule: string;
  interest_schedule: string;
  total_capital_need: number;
  equity_amount: number;
  expected_revenue: number;
  expected_profit: number;
};

export type CollateralType = "qsd_dat" | "dong_san" | "tiet_kiem" | "tai_san_khac";

export type ExtractedCollateral = {
  // Common
  name: string;
  type: CollateralType;
  total_value: number;
  obligation: number;

  // QSD đất
  certificate_serial: string;
  land_address: string;
  land_area: string;
  land_type_1: string;
  land_unit_price_1: number;
  land_type_2: string;
  land_unit_price_2: number;
  lot_number: string;
  sheet_number: string;

  // Động sản (xe, máy móc)
  registration_number: string;
  brand: string;
  model: string;
  year: string;
  chassis_number: string;
  engine_number: string;

  // Tiết kiệm
  savings_book_number: string;
  deposit_bank_name: string;
  deposit_amount: number;
  deposit_date: string;

  // Tài sản khác
  description: string;
};

export type ExtractedCoBorrower = {
  full_name: string;
  id_number: string;
  id_old: string;
  id_issued_date: string;
  id_issued_place: string;
  birth_year: string;
  phone: string;
  current_address: string;
  permanent_address: string;
  relationship: string;
};

export type ExtractionResult = {
  customer: Partial<ExtractedCustomer>;
  loans: Partial<ExtractedLoan>[];
  collaterals: Partial<ExtractedCollateral>[];
  co_borrowers: Partial<ExtractedCoBorrower>[];
};

// ─── Prompt ──────────────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `
VAI TRÒ: Chuyên gia phân tích hồ sơ vay ngân hàng Việt Nam (khách hàng cá nhân).
NHIỆM VỤ: Trích xuất thông tin khách hàng, người đồng vay, khoản vay, và tài sản bảo đảm từ tài liệu.

QUY TẮC CHUNG:
1. Chỉ trích xuất khi CHẮC CHẮN giá trị xuất hiện trong tài liệu.
2. Nếu không tìm thấy, trả chuỗi rỗng "" hoặc số 0.
3. Số: bỏ dấu phân cách nghìn (1.234.567 → 1234567). KHÔNG dùng dấu phẩy hoặc chấm.
4. Ngày: chuẩn hoá về YYYY-MM-DD (ví dụ "15/03/2024" → "2024-03-15").
5. Nếu có nhiều khoản vay, tài sản, hoặc người đồng vay, trả về mảng.
6. gender: chuẩn hoá "Nam"→"male", "Nữ"→"female".
7. marital_status: "Độc thân"→"single", "Đã kết hôn"→"married".

QUY TẮC TSBĐ (COLLATERAL):
- type bắt buộc là 1 trong: "qsd_dat" (quyền sử dụng đất), "dong_san" (xe, máy móc), "tiet_kiem" (sổ tiết kiệm), "tai_san_khac".
- Mỗi TSBĐ chỉ fill fields tương ứng với type, còn lại để rỗng/0.
- QSD đất: ưu tiên extract certificate_serial, land_address, land_area, loại đất (ONT, CLN, LUC...), đơn giá.
- Động sản: ưu tiên biển số (registration_number), hãng/model/năm, số khung/máy.
- Tiết kiệm: số sổ, tên NH, số tiền, ngày gửi.

QUY TẮC NGƯỜI ĐỒNG VAY (CO_BORROWER):
- Trích xuất cả vợ/chồng và người đồng trả nợ khác. Quan hệ ghi rõ: "Vợ", "Chồng", "Con", "Anh", "Em"...
- Nếu tài liệu không đề cập người đồng vay, trả mảng rỗng [].
- Vợ/chồng của khách hàng chính (dù chỉ ký tên đồng ý vay) cũng tính là người đồng vay nếu có thông tin CCCD/địa chỉ.

QUY TẮC KHOẢN VAY:
- loan_method bắt buộc là 1 trong: "tung_lan" (cho vay từng lần), "han_muc" (hạn mức), "trung_dai" (trung dài hạn), "tieu_dung" (tiêu dùng).
- Nếu tài liệu không rõ, suy đoán từ mục đích vay.
- total_capital_need = tổng nhu cầu vốn của phương án, equity_amount = vốn tự có.

Trả về JSON theo schema chính xác:
{
  "customer": {
    "customer_name": "", "customer_code": "", "cccd": "", "cccd_old": "",
    "cccd_issued_date": "", "cccd_issued_place": "",
    "date_of_birth": "", "gender": "", "phone": "", "address": "",
    "email": "", "bank_account": "", "bank_name": "",
    "marital_status": "", "spouse_name": "", "spouse_cccd": ""
  },
  "co_borrowers": [{
    "full_name": "", "id_number": "", "id_old": "",
    "id_issued_date": "", "id_issued_place": "",
    "birth_year": "", "phone": "",
    "current_address": "", "permanent_address": "",
    "relationship": ""
  }],
  "loans": [{
    "contract_number": "", "loan_amount": 0, "interest_rate": 0,
    "purpose": "", "start_date": "", "end_date": "",
    "loan_method": "", "lending_method": "",
    "principal_schedule": "", "interest_schedule": "",
    "total_capital_need": 0, "equity_amount": 0,
    "expected_revenue": 0, "expected_profit": 0
  }],
  "collaterals": [{
    "name": "", "type": "qsd_dat",
    "total_value": 0, "obligation": 0,
    "certificate_serial": "", "land_address": "", "land_area": "",
    "land_type_1": "", "land_unit_price_1": 0,
    "land_type_2": "", "land_unit_price_2": 0,
    "lot_number": "", "sheet_number": "",
    "registration_number": "", "brand": "", "model": "", "year": "",
    "chassis_number": "", "engine_number": "",
    "savings_book_number": "", "deposit_bank_name": "",
    "deposit_amount": 0, "deposit_date": "",
    "description": ""
  }]
}

Chỉ trả JSON thuần, không giải thích, không markdown fence.

TÀI LIỆU:
---
`.trim();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Head 30k + tail 10k to fit token limits */
function truncateText(text: string): string {
  if (text.length <= 40_000) return text;
  return `${text.slice(0, 30_000)}\n\n...(rút gọn)...\n\n${text.slice(-10_000)}`;
}

const EMPTY_RESULT: ExtractionResult = { customer: {}, loans: [], collaterals: [], co_borrowers: [] };

// ─── Service ─────────────────────────────────────────────────────────────────

/** Send document text to Gemini and get structured customer data back */
export async function extractCustomerDataFromText(documentText: string): Promise<ExtractionResult> {
  const { apiKey, model } = resolveAiProvider({ defaultGeminiModel: "gemini-2.5-flash" });
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model });

  const prompt = `${EXTRACTION_PROMPT}\n${truncateText(documentText)}\n---`;

  const result = await geminiModel.generateContent({
    generationConfig: { temperature: 0 },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  // Parse JSON from response — prompt instructs JSON-only output
  let text = result.response.text().trim();
  // Strip markdown code fences if present
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }
  if (!text) return EMPTY_RESULT;

  let parsed: ExtractionResult;
  try {
    parsed = JSON.parse(text) as ExtractionResult;
  } catch {
    console.error("[customer-docx-extraction] Failed to parse AI response:", text.slice(0, 200));
    return EMPTY_RESULT;
  }

  return {
    customer: parsed.customer ?? {},
    loans: toArray(parsed.loans),
    collaterals: toArray(parsed.collaterals),
    co_borrowers: toArray(parsed.co_borrowers),
  };
}

/** Normalize potentially-single or missing arrays into a real array. */
function toArray<T>(val: T[] | T | undefined): T[] {
  if (Array.isArray(val)) return val;
  if (val === undefined || val === null) return [];
  return [val];
}

/** Merge multiple extraction results — pick non-empty customer values, deduplicate arrays */
export function mergeExtractionResults(results: ExtractionResult[]): ExtractionResult {
  if (results.length === 1) return results[0];

  const merged: ExtractionResult = { customer: {}, loans: [], collaterals: [], co_borrowers: [] };

  for (const r of results) {
    for (const [k, v] of Object.entries(r.customer)) {
      const key = k as keyof ExtractedCustomer;
      if (v && !merged.customer[key]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (merged.customer as any)[key] = v;
      }
    }
    for (const loan of r.loans) {
      if (loan.contract_number && !merged.loans.some((l) => l.contract_number === loan.contract_number)) {
        merged.loans.push(loan);
      } else if (!loan.contract_number && merged.loans.length === 0) {
        merged.loans.push(loan);
      }
    }
    for (const col of r.collaterals) {
      const exists = merged.collaterals.some(
        (c) => (col.certificate_serial && c.certificate_serial === col.certificate_serial) ||
               (col.name && c.name === col.name),
      );
      if (!exists) merged.collaterals.push(col);
    }
    for (const cob of r.co_borrowers) {
      const exists = merged.co_borrowers.some(
        (c) => (cob.id_number && c.id_number === cob.id_number) ||
               (cob.full_name && c.full_name === cob.full_name),
      );
      if (!exists) merged.co_borrowers.push(cob);
    }
  }

  return merged;
}
