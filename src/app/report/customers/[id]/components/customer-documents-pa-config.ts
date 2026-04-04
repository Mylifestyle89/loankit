// Configuration and types for customer loan plan documents (Tài liệu liên quan PA)

export type DocumentPAEntry = {
  document_type: string;     // VD: "GCN đăng ký kinh doanh"
  number: string;            // VD: "42033078A"
  issuing_authority: string; // VD: "Phòng Tài chính Kế hoạch UBND TP Đà Lạt"
  issue_date: string;        // VD: "11/04/2019" (DD/MM/YYYY)
  notes: string;             // Ghi chú thêm
};

// Common document types
export const DOCUMENT_PA_TYPES = [
  "GCN đăng ký kinh doanh",
  "Giấy phép an toàn thực phẩm",
  "Giấy chứng nhận đủ điều kiện VSATTP",
  "Giấy phép sử dụng đất",
  "Hợp đồng thuê/cho thuê",
  "Giấy chứng nhận môi trường",
  "Giấy chứng nhận năng lực kỹ thuật",
  "Khác",
] as const;

// Form field labels
export const DOCUMENT_PA_LABELS = {
  document_type: "Loại tài liệu",
  number: "Số tài liệu",
  issuing_authority: "Cơ quan cấp",
  issue_date: "Ngày cấp (DD/MM/YYYY)",
  notes: "Ghi chú",
} as const;
