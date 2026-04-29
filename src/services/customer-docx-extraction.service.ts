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
  // Thông tin GCN / giấy tờ (dùng cho cả qsd_dat và dong_san)
  certificate_serial: string;    // Số GCN / số đăng ký xe
  gcn_name: string;              // Tên đầy đủ của GCN
  gcn_issued_by: string;         // Cơ quan cấp GCN / đăng ký xe
  gcn_issued_date: string;       // Ngày cấp GCN / đăng ký xe (YYYY-MM-DD)
  // Tình trạng & thẩm định (dùng cho cả qsd_dat và dong_san)
  asset_condition: string;       // Tình trạng sử dụng TS
  asset_owner: string;           // Tên chủ sở hữu TS
  liquidity_note: string;        // Tính thanh khoản
  insurance_note: string;        // Mua bảo hiểm TSBĐ
  remaining_duration: string;    // Thời hạn sử dụng còn lại

  // QSD đất — thửa đất
  lot_number: string;            // Số thửa đất
  sheet_number: string;          // Số tờ bản đồ
  land_address: string;          // Địa chỉ thửa đất
  land_area: string;             // Diện tích (m², chỉ số)
  land_usage_form: string;       // Hình thức sử dụng (riêng/chung và m²)
  land_usage_purpose: string;    // Mục đích sử dụng đất (ONT, CLN, LUC...)
  land_usage_duration: string;   // Thời hạn sử dụng đất
  land_origin: string;           // Nguồn gốc sử dụng đất
  land_type_1: string;           // Loại đất chính (tên loại)
  land_unit_price_1: number;     // Đơn giá loại đất chính (đồng/m²)
  land_type_2: string;           // Loại đất phụ (nếu có)
  land_unit_price_2: number;     // Đơn giá loại đất phụ

  // QSD đất — nhà gắn liền với đất
  building_type: string;         // Loại nhà ở (Nhà ở riêng lẻ, căn hộ...)
  building_built_area: string;   // Diện tích xây dựng (m², chỉ số)
  building_floor_area: string;   // Diện tích sàn (m², chỉ số)
  building_structure: string;    // Kết cấu nhà
  building_ownership_form: string; // Hình thức sở hữu (riêng/chung)
  building_grade: string;        // Cấp/hạng nhà
  building_floors: string;       // Số tầng

  // Động sản (xe, máy móc)
  registration_number: string;   // Biển kiểm soát / biển số
  brand: string;                 // Nhãn hiệu xe
  model: string;                 // Số loại xe
  color: string;                 // Màu sơn
  year: string;                  // Năm sản xuất
  chassis_number: string;        // Số khung
  engine_number: string;         // Số máy
  seat_count: string;            // Số chỗ ngồi

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
- type bắt buộc là 1 trong: "qsd_dat" (quyền sử dụng đất/nhà ở), "dong_san" (xe, máy móc), "tiet_kiem" (sổ tiết kiệm), "tai_san_khac".
- Tài liệu Agribank trình bày TSBĐ theo cấu trúc a) b) c) d) e) f) g) — đọc toàn bộ các mục.
- Nếu có nhiều TSBĐ (nhiều thửa đất / xe), tạo object riêng cho mỗi tài sản.
- Trích xuất TỐI ĐA thông tin có thể từ tài liệu, không bỏ sót.

QSD ĐẤT (type="qsd_dat") — fields cần extract:
- certificate_serial: Số GCN. Ví dụ: "AA 01224578", "BS 123456". Nằm trong câu "số [Số seri]".
- gcn_name: Tên đầy đủ GCN. Ví dụ: "Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất".
- gcn_issued_by: Cơ quan cấp GCN. Ví dụ: "Chi nhánh văn phòng đăng ký đất đai thành phố Đà Lạt".
- gcn_issued_date: Ngày cấp (YYYY-MM-DD). Ví dụ: "2025-06-30".
- lot_number: Số thửa đất. Ví dụ: "18", "128". Nằm sau "Thửa đất số:".
- sheet_number: Số tờ bản đồ. Ví dụ: "11", "5". Nằm sau "Tờ bản đồ số:".
- land_address: Địa chỉ thửa đất. Ví dụ: "16/9 Nam Kỳ Khởi Nghĩa, phường 1, Đà Lạt, Lâm Đồng".
- land_area: Diện tích (chỉ số, bỏ "m2"). Ví dụ: "88.3", "500".
- land_usage_form: Hình thức sử dụng. Ví dụ: "Sử dụng riêng: 0 m2; Sử dụng chung: 88,3 m2".
- land_usage_purpose: Mục đích sử dụng đất. Ví dụ: "Đất ở tại đô thị", "CLN", "ONT".
- land_usage_duration: Thời hạn sử dụng đất. Ví dụ: "Lâu dài", "50 năm".
- land_origin: Nguồn gốc sử dụng đất. Ví dụ: "Nhà nước giao có thu tiền".
- land_type_1: Loại đất chính (mã loại). Ví dụ: "ONT", "CLN", "LUC", "Đất ở tại đô thị".
- land_unit_price_1: Đơn giá loại đất chính (đồng/m²). Ví dụ: 80000000.
- land_type_2, land_unit_price_2: Loại đất phụ và đơn giá nếu có.
- total_value: Tổng giá trị TSBĐ (đồng). Nằm trong bảng định giá "Tổng cộng" hoặc "Giá trị làm tròn". Ví dụ: 7064000000.
- obligation: Nghĩa vụ bảo đảm (đồng). Tìm "không vượt quá X đồng". Ví dụ: 1000000000.
- building_type: Loại nhà gắn liền. Ví dụ: "Nhà ở riêng lẻ", "Căn hộ chung cư".
- building_built_area: Diện tích xây dựng (chỉ số m²). Ví dụ: "62.9".
- building_floor_area: Diện tích sàn (chỉ số m²). Ví dụ: "62.9".
- building_structure: Kết cấu nhà. Ví dụ: "Bê tông cốt thép".
- building_ownership_form: Hình thức sở hữu nhà. Ví dụ: "Sở hữu chung", "Sở hữu riêng".
- building_grade: Cấp/hạng nhà. Ví dụ: "Cấp 3", "Cấp 4".
- building_floors: Số tầng. Ví dụ: "3", "01 trệt 02 lầu".
- asset_condition: Tình trạng TS (mục c). Ví dụ: "căn nhà cũ đã được tháo dỡ, hiện có nhà 01 trệt 02 lầu".
- asset_owner: Tên chủ sở hữu TS (mục d). Ví dụ: "Ông Nguyễn Hoàng Quân - bà Nguyễn Hoàng Phúc An".
- liquidity_note: Tính thanh khoản (mục e). Tóm tắt.
- insurance_note: Mua bảo hiểm (mục f). Ví dụ: "Tài sản không thuộc danh mục phải mua bảo hiểm".
- remaining_duration: Thời hạn sử dụng còn lại (mục g). Ví dụ: "Lâu dài", "30 năm".

ĐỘNG SẢN (type="dong_san") — fields cần extract:
- certificate_serial: Số giấy đăng ký xe. Tìm "Giấy chứng nhận đăng ký xe... số [số]".
- gcn_issued_by: Cơ quan cấp đăng ký xe.
- gcn_issued_date: Ngày cấp đăng ký xe (YYYY-MM-DD).
- registration_number: Biển kiểm soát. Ví dụ: "51A-123.45".
- brand: Nhãn hiệu xe. Ví dụ: "Toyota", "Honda".
- model: Số loại xe. Ví dụ: "Camry", "CR-V 1.5L".
- color: Màu sơn. Ví dụ: "Trắng", "Đen".
- year: Năm sản xuất. Ví dụ: "2020".
- chassis_number: Số khung.
- engine_number: Số máy.
- seat_count: Số chỗ ngồi. Ví dụ: "5", "7".
- asset_condition, asset_owner, liquidity_note, insurance_note, remaining_duration: tương tự qsd_dat.
- total_value, obligation: tương tự qsd_dat.

TIẾT KIỆM (type="tiet_kiem"):
- savings_book_number: Số sổ TK. deposit_bank_name: Tên NH. deposit_amount: Số tiền. deposit_date: Ngày gửi.

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
    "name": "", "type": "qsd_dat", "total_value": 0, "obligation": 0,
    "certificate_serial": "", "gcn_name": "", "gcn_issued_by": "", "gcn_issued_date": "",
    "asset_condition": "", "asset_owner": "", "liquidity_note": "", "insurance_note": "", "remaining_duration": "",
    "lot_number": "", "sheet_number": "", "land_address": "", "land_area": "",
    "land_usage_form": "", "land_usage_purpose": "", "land_usage_duration": "", "land_origin": "",
    "land_type_1": "", "land_unit_price_1": 0, "land_type_2": "", "land_unit_price_2": 0,
    "building_type": "", "building_built_area": "", "building_floor_area": "",
    "building_structure": "", "building_ownership_form": "", "building_grade": "", "building_floors": "",
    "registration_number": "", "brand": "", "model": "", "color": "", "year": "",
    "chassis_number": "", "engine_number": "", "seat_count": "",
    "savings_book_number": "", "deposit_bank_name": "", "deposit_amount": 0, "deposit_date": "",
    "description": ""
  }]
}

Chỉ trả JSON thuần, không giải thích, không markdown fence.

TÀI LIỆU:
---
`.trim();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Smart truncation: giữ toàn bộ sections có TSBĐ (GCN, biển số, sổ TK),
 * truncate phần còn lại theo head+tail.
 */
function truncateText(text: string): string {
  if (text.length <= 40_000) return text;

  // Tìm các line có keyword TSBĐ → giữ lại cùng context ±20 lines
  const COLLATERAL_KEYWORDS = /GCN|Giấy chứng nhận|số thửa|tờ bản đồ|biển số|số khung|số máy|sổ tiết kiệm|QSDĐ|đất ở|CLN|ONT|LUC|TSBĐ|tài sản bảo đảm/i;
  const lines = text.split("\n");
  const keepLines = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    if (COLLATERAL_KEYWORDS.test(lines[i])) {
      for (let j = Math.max(0, i - 20); j <= Math.min(lines.length - 1, i + 20); j++) {
        keepLines.add(j);
      }
    }
  }

  const collateralSection = lines
    .filter((_, i) => keepLines.has(i))
    .join("\n");

  // Head (customer/loan info) + collateral sections + tail
  const headText = text.slice(0, 20_000);
  const tailText = text.slice(-5_000);
  const combined = `${headText}\n\n...\n\n${collateralSection}\n\n...\n\n${tailText}`;

  // If combined still too large, fallback
  return combined.length <= 60_000 ? combined : `${text.slice(0, 30_000)}\n\n...(rút gọn)...\n\n${text.slice(-10_000)}`;
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
