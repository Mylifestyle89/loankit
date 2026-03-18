/**
 * Prompt templates for structured document extraction via Gemini Vision.
 * Each template defines expected fields and Vietnamese instructions for a document type.
 */

export type DocumentType = "cccd" | "land_cert" | "savings_book" | "vehicle_reg";

export type DocumentExtractionResult = {
  documentType: DocumentType;
  fields: Record<string, string>;
  confidence: number; // 0-1
};

// Human-readable labels for UI display
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  cccd: "CCCD / CMND",
  land_cert: "Giấy chứng nhận QSDĐ (Sổ đỏ)",
  savings_book: "Sổ tiết kiệm",
  vehicle_reg: "Đăng ký xe",
};

type PromptTemplate = {
  description: string;
  fields: string[];
  prompt: string;
};

const TEMPLATES: Record<DocumentType, PromptTemplate> = {
  cccd: {
    description: "Căn cước công dân / Chứng minh nhân dân",
    fields: [
      "full_name", "cccd_number", "date_of_birth", "gender",
      "nationality", "place_of_origin", "place_of_residence",
      "issued_date", "issued_place", "expiry_date",
    ],
    prompt: `Đây là ảnh Căn cước công dân (CCCD) hoặc Chứng minh nhân dân (CMND) Việt Nam.
Hãy trích xuất chính xác các trường sau từ ảnh. Nếu không đọc được trường nào, để giá trị rỗng "".
Ngày tháng theo định dạng dd/mm/yyyy. Trả về JSON với các key sau:
full_name, cccd_number, date_of_birth, gender, nationality, place_of_origin, place_of_residence, issued_date, issued_place, expiry_date, confidence.
confidence là số từ 0 đến 1 thể hiện độ tin cậy tổng thể của kết quả.`,
  },
  land_cert: {
    description: "Giấy chứng nhận quyền sử dụng đất",
    fields: [
      "certificate_number", "owner_name", "land_address",
      "land_area_m2", "land_use_purpose", "land_use_duration", "issued_date",
      "lot_number", "map_sheet", "land_origin",
    ],
    prompt: `Đây là ảnh Giấy chứng nhận quyền sử dụng đất (Sổ đỏ / Sổ hồng) Việt Nam.
Hãy trích xuất chính xác các trường sau. Nếu không đọc được, để "".
Ngày tháng dd/mm/yyyy. Trả về JSON với key:
certificate_number, owner_name, land_address, land_area_m2, land_use_purpose, land_use_duration, issued_date, lot_number (số thửa), map_sheet (tờ bản đồ số), land_origin (nguồn gốc sử dụng), confidence.`,
  },
  savings_book: {
    description: "Sổ tiết kiệm ngân hàng",
    fields: [
      "book_number", "owner_name", "bank_name", "amount",
      "currency", "term_months", "interest_rate", "open_date", "maturity_date",
    ],
    prompt: `Đây là ảnh Sổ tiết kiệm ngân hàng Việt Nam.
Hãy trích xuất chính xác các trường sau. Nếu không đọc được, để "".
Số tiền giữ nguyên định dạng gốc. Ngày tháng dd/mm/yyyy. Trả về JSON với key:
book_number, owner_name, bank_name, amount, currency, term_months, interest_rate, open_date, maturity_date, confidence.`,
  },
  vehicle_reg: {
    description: "Giấy đăng ký xe",
    fields: [
      "plate_number", "owner_name", "vehicle_type", "brand_model",
      "color", "frame_number", "engine_number", "registration_date",
    ],
    prompt: `Đây là ảnh Giấy đăng ký xe (ô tô / xe máy) Việt Nam.
Hãy trích xuất chính xác các trường sau. Nếu không đọc được, để "".
Ngày tháng dd/mm/yyyy. Trả về JSON với key:
plate_number, owner_name, vehicle_type, brand_model, color, frame_number, engine_number, registration_date, confidence.`,
  },
};

/** Valid document types for validation */
export const VALID_DOCUMENT_TYPES = Object.keys(TEMPLATES) as DocumentType[];

export function isValidDocumentType(type: string): type is DocumentType {
  return VALID_DOCUMENT_TYPES.includes(type as DocumentType);
}

export function getPromptTemplate(type: DocumentType): PromptTemplate {
  return TEMPLATES[type];
}
