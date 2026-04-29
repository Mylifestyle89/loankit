/**
 * Focused AI extraction from pasted text (clipboard) — one entity at a time.
 * Lighter than the full DOCX import: user pastes one section → AI returns that entity.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { resolveAiProvider } from "@/lib/ai";
import type { ExtractedCollateral, ExtractedCustomer, ExtractedCoBorrower, ExtractedLoan } from "./customer-docx-extraction.service";

export type AiExtractEntityType = "collateral" | "customer" | "co_borrower" | "loan";

// ─── Prompts ─────────────────────────────────────────────────────────────────

const COLLATERAL_PROMPT = `
Vai trò: Chuyên gia phân tích hồ sơ tài sản bảo đảm ngân hàng Việt Nam (Agribank).
Nhiệm vụ: Trích xuất thông tin TÀI SẢN BẢO ĐẢM từ đoạn văn dưới đây.

Quy tắc chung:
1. Chỉ trích xuất khi CHẮC CHẮN thấy trong văn bản.
2. Số: bỏ dấu phân cách nghìn (1.234.567 → 1234567). Không dùng dấu phẩy hoặc chấm.
3. Ngày: chuẩn hóa về YYYY-MM-DD (30/6/2025 → 2025-06-30).
4. Nếu không tìm thấy: trả "" hoặc 0.
5. Nếu có NHIỀU tài sản, trả mảng nhiều object.

Quy tắc type:
- "qsd_dat": đất ở, đất nông nghiệp, nhà gắn với đất, GCN QSDĐ
- "dong_san": xe ô tô, phương tiện, máy móc, giấy đăng ký xe
- "tiet_kiem": thẻ tiết kiệm, sổ tiết kiệm, giấy tờ có giá
- "tai_san_khac": tài sản khác

QSD ĐẤT — chi tiết:
- certificate_serial: Số GCN. VD: "AA 01224578". Nằm sau "số" hoặc "số seri".
- gcn_name: Tên đầy đủ GCN. VD: "Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất".
- gcn_issued_by: Cơ quan cấp. VD: "Chi nhánh VPĐKĐĐ thành phố Đà Lạt".
- gcn_issued_date: Ngày cấp (YYYY-MM-DD).
- lot_number: Số thửa. Nằm sau "Thửa đất số:". VD: "18".
- sheet_number: Số tờ bản đồ. Nằm sau "Tờ bản đồ số:". VD: "11".
- land_address: Địa chỉ thửa đất. Nằm sau "Địa chỉ:".
- land_area: Diện tích m² (chỉ số). VD: "88.3".
- land_usage_form: Hình thức sử dụng. VD: "Sử dụng riêng: 0 m2; Sử dụng chung: 88,3 m2".
- land_usage_purpose: Mục đích sử dụng đất. VD: "Đất ở tại đô thị", "CLN".
- land_usage_duration: Thời hạn sử dụng đất. VD: "Lâu dài".
- land_origin: Nguồn gốc sử dụng đất.
- land_type_1: Loại đất chính. VD: "ONT", "CLN", "Đất ở tại đô thị".
- land_unit_price_1: Đơn giá đất chính (đồng/m²). VD: 80000000.
- land_type_2, land_unit_price_2: Loại đất phụ nếu có.
- building_type: Loại nhà ở. VD: "Nhà ở riêng lẻ".
- building_built_area: Diện tích xây dựng (m², chỉ số). VD: "62.9".
- building_floor_area: Diện tích sàn (m², chỉ số). VD: "62.9".
- building_structure: Kết cấu nhà.
- building_ownership_form: Hình thức sở hữu nhà. VD: "Sở hữu chung".
- building_grade: Cấp/hạng nhà.
- building_floors: Số tầng. VD: "01 trệt 02 lầu".
- asset_condition: Tình trạng TS (mục c). VD: "Nhà ở đang sử dụng bình thường".
- asset_owner: Tên chủ sở hữu (mục d). VD: "Ông Nguyễn Văn A - Bà Trần Thị B".
- liquidity_note: Tính thanh khoản (mục e). Tóm tắt ngắn.
- insurance_note: Mua bảo hiểm (mục f). VD: "Không thuộc danh mục phải mua bảo hiểm".
- remaining_duration: Thời hạn sử dụng còn lại (mục g). VD: "Lâu dài".
- total_value: Tổng giá trị định giá TSBĐ (đồng). Nằm trong bảng "Tổng cộng". VD: 7064000000.
- obligation: Nghĩa vụ bảo đảm (đồng). Nằm sau "không vượt quá X đồng". VD: 1000000000.
- name: Tên ngắn gọn của TSBĐ. VD: "QSD đất tại 16/9 Nam Kỳ Khởi Nghĩa, Đà Lạt".

ĐỘNG SẢN — chi tiết:
- certificate_serial: Số giấy đăng ký xe.
- gcn_issued_by: Cơ quan cấp. gcn_issued_date: Ngày cấp (YYYY-MM-DD).
- registration_number: Biển kiểm soát. VD: "51A-123.45".
- brand: Nhãn hiệu. model: Số loại. color: Màu sơn.
- year: Năm sản xuất. chassis_number: Số khung. engine_number: Số máy. seat_count: Số chỗ ngồi.
- asset_condition, asset_owner, liquidity_note, insurance_note, remaining_duration: như qsd_dat.
- total_value, obligation, name: như qsd_dat.

TIẾT KIỆM: savings_book_number, deposit_bank_name, deposit_amount (số), deposit_date (YYYY-MM-DD).

Trả về JSON dạng MẢNG (ngay cả khi chỉ có 1 tài sản):
[{
  "name": "", "type": "qsd_dat", "total_value": 0, "obligation": 0,
  "certificate_serial": "", "gcn_name": "", "gcn_issued_by": "", "gcn_issued_date": "",
  "lot_number": "", "sheet_number": "", "land_address": "", "land_area": "",
  "land_usage_form": "", "land_usage_purpose": "", "land_usage_duration": "", "land_origin": "",
  "land_type_1": "", "land_unit_price_1": 0, "land_type_2": "", "land_unit_price_2": 0,
  "building_type": "", "building_built_area": "", "building_floor_area": "",
  "building_structure": "", "building_ownership_form": "", "building_grade": "", "building_floors": "",
  "asset_condition": "", "asset_owner": "", "liquidity_note": "", "insurance_note": "", "remaining_duration": "",
  "registration_number": "", "brand": "", "model": "", "color": "", "year": "",
  "chassis_number": "", "engine_number": "", "seat_count": "",
  "savings_book_number": "", "deposit_bank_name": "", "deposit_amount": 0, "deposit_date": ""
}]

Chỉ trả JSON thuần, không giải thích, không markdown.

VĂN BẢN CẦN TRÍCH XUẤT:
---
`.trim();

const CUSTOMER_PROMPT = `
Vai trò: Chuyên gia phân tích hồ sơ khách hàng ngân hàng Việt Nam.
Nhiệm vụ: Trích xuất thông tin KHÁCH HÀNG từ đoạn văn dưới đây.

Quy tắc:
1. Chỉ trích xuất khi CHẮC CHẮN thấy trong văn bản.
2. Ngày: YYYY-MM-DD.
3. gender: "Nam" → "male", "Nữ" → "female".
4. marital_status: "Độc thân" → "single", "Kết hôn" → "married".

Fields cần extract:
- customer_name: Họ tên đầy đủ. VD: "Nguyễn Hoàng Quân".
- date_of_birth: Năm sinh hoặc ngày sinh (YYYY hoặc YYYY-MM-DD). VD: "1984".
- gender: "male" hoặc "female". Dựa vào danh xưng Ông/Bà.
- cccd: Số CCCD (12 số). VD: "079084037475".
- cccd_old: Số CMND cũ (9 số) nếu có.
- cccd_issued_date: Ngày cấp CCCD/CMND (YYYY-MM-DD).
- cccd_issued_place: Nơi cấp CCCD/CMND.
- address: Nơi cư trú/địa chỉ.
- phone: Số điện thoại.
- marital_status: "single" hoặc "married". Tìm "Độc thân"/"Kết hôn"/"Giấy xác nhận tình trạng hôn nhân".
- spouse_name: Họ tên vợ/chồng nếu có.
- spouse_cccd: CCCD vợ/chồng nếu có.
- bank_account: Số tài khoản ngân hàng nếu có.
- bank_name: Tên ngân hàng nếu có.

Trả về JSON object (không phải mảng):
{"customer_name":"","date_of_birth":"","gender":"","cccd":"","cccd_old":"","cccd_issued_date":"","cccd_issued_place":"","address":"","phone":"","marital_status":"","spouse_name":"","spouse_cccd":"","bank_account":"","bank_name":""}

Chỉ trả JSON thuần, không giải thích.

VĂN BẢN:
---
`.trim();

const CO_BORROWER_PROMPT = `
Vai trò: Chuyên gia phân tích hồ sơ vay ngân hàng Việt Nam.
Nhiệm vụ: Trích xuất thông tin NGƯỜI ĐỒNG VAY / NGƯỜI LIÊN QUAN từ đoạn văn.

Quy tắc: Ngày → YYYY-MM-DD. Trả mảng nếu nhiều người.

Fields:
- full_name: Họ tên. id_number: CCCD (12 số). id_old: CMND cũ.
- id_issued_date: Ngày cấp (YYYY-MM-DD). id_issued_place: Nơi cấp.
- birth_year: Năm sinh. phone: SĐT.
- current_address: Địa chỉ hiện tại. permanent_address: Thường trú.
- relationship: Quan hệ với KH chính. VD: "Vợ", "Con", "Đồng sở hữu tài sản".

Trả JSON mảng:
[{"full_name":"","id_number":"","id_old":"","id_issued_date":"","id_issued_place":"","birth_year":"","phone":"","current_address":"","permanent_address":"","relationship":""}]

Chỉ JSON thuần.

VĂN BẢN:
---
`.trim();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function callGemini(prompt: string, text: string): Promise<string> {
  const { apiKey, model } = resolveAiProvider({ defaultGeminiModel: "gemini-2.5-flash" });
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model });

  const result = await geminiModel.generateContent({
    generationConfig: { temperature: 0 },
    contents: [{ role: "user", parts: [{ text: `${prompt}\n${text.slice(0, 30_000)}\n---` }] }],
  });

  let raw = result.response.text().trim();
  if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  return raw;
}

// ─── Exported extractors ─────────────────────────────────────────────────────

export async function extractCollateralsFromText(text: string): Promise<Partial<ExtractedCollateral>[]> {
  const raw = await callGemini(COLLATERAL_PROMPT, text);
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

export async function extractCustomerFromText(text: string): Promise<Partial<ExtractedCustomer>> {
  const raw = await callGemini(CUSTOMER_PROMPT, text);
  return JSON.parse(raw) as Partial<ExtractedCustomer>;
}

export async function extractCoBorrowersFromText(text: string): Promise<Partial<ExtractedCoBorrower>[]> {
  const raw = await callGemini(CO_BORROWER_PROMPT, text);
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

export async function extractLoanFromText(text: string): Promise<Partial<ExtractedLoan>> {
  // Reuse full extraction but only return loans[0]
  const { extractCustomerDataFromText } = await import("./customer-docx-extraction.service");
  const result = await extractCustomerDataFromText(text);
  return result.loans[0] ?? {};
}
