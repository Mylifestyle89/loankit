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
  cccd_issued_date: string;
  cccd_issued_place: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  address: string;
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
};

export type ExtractedCollateral = {
  name: string;
  type: string;
  certificate_serial: string;
  land_address: string;
  total_value: number;
  obligation: number;
  land_area: string;
  land_type_1: string;
  land_unit_price_1: number;
};

export type ExtractionResult = {
  customer: Partial<ExtractedCustomer>;
  loans: Partial<ExtractedLoan>[];
  collaterals: Partial<ExtractedCollateral>[];
};

// ─── Prompt ──────────────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `
VAI TRÒ: Chuyên gia phân tích hồ sơ vay ngân hàng Việt Nam.
NHIỆM VỤ: Trích xuất thông tin khách hàng, khoản vay, và tài sản bảo đảm từ tài liệu.

QUY TẮC:
1. Chỉ trích xuất khi CHẮC CHẮN giá trị xuất hiện trong tài liệu.
2. Nếu không tìm thấy, trả chuỗi rỗng "" hoặc 0.
3. Định dạng số: bỏ dấu phân cách nghìn (1.234.567 → 1234567).
4. Ngày: chuyển về YYYY-MM-DD nếu nhận ra.
5. Nếu có nhiều khoản vay hoặc tài sản, trả về mảng.

Trả về JSON theo schema:
{
  "customer": {
    "customer_name": "", "customer_code": "", "cccd": "",
    "cccd_issued_date": "", "cccd_issued_place": "",
    "date_of_birth": "", "gender": "", "phone": "",
    "address": "", "marital_status": "",
    "spouse_name": "", "spouse_cccd": ""
  },
  "loans": [{
    "contract_number": "", "loan_amount": 0,
    "interest_rate": 0, "purpose": "",
    "start_date": "", "end_date": ""
  }],
  "collaterals": [{
    "name": "", "type": "qsd_dat",
    "certificate_serial": "", "land_address": "",
    "total_value": 0, "obligation": 0,
    "land_area": "", "land_type_1": "", "land_unit_price_1": 0
  }]
}

Chỉ trả JSON, không giải thích.

TÀI LIỆU:
---
`.trim();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Head 30k + tail 10k to fit token limits */
function truncateText(text: string): string {
  if (text.length <= 40_000) return text;
  return `${text.slice(0, 30_000)}\n\n...(rút gọn)...\n\n${text.slice(-10_000)}`;
}

const EMPTY_RESULT: ExtractionResult = { customer: {}, loans: [], collaterals: [] };

// ─── Service ─────────────────────────────────────────────────────────────────

/** Send document text to Gemini and get structured customer data back */
export async function extractCustomerDataFromText(documentText: string): Promise<ExtractionResult> {
  const { apiKey, model } = resolveAiProvider({ defaultGeminiModel: "gemini-1.5-flash" });
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model }, { apiVersion: "v1" });

  const prompt = `${EXTRACTION_PROMPT}\n${truncateText(documentText)}\n---`;

  const result = await geminiModel.generateContent({
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
    },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const text = result.response.text().trim();
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
    loans: Array.isArray(parsed.loans) ? parsed.loans : parsed.loans ? [parsed.loans] : [],
    collaterals: Array.isArray(parsed.collaterals)
      ? parsed.collaterals
      : parsed.collaterals
        ? [parsed.collaterals]
        : [],
  };
}

/** Merge multiple extraction results — pick non-empty customer values, deduplicate arrays */
export function mergeExtractionResults(results: ExtractionResult[]): ExtractionResult {
  if (results.length === 1) return results[0];

  const merged: ExtractionResult = { customer: {}, loans: [], collaterals: [] };

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
  }

  return merged;
}
