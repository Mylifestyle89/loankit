// Maps .BK ClientAttributes.Key to FrameworkState field keys
// Format: { "bkAttributeKey": "frameworkStateKey", ... }

export const BK_TO_FRAMEWORK_MAPPING: Record<string, string> = {
  // A.general - Customer & Organization Info
  "Tên khách hàng": "A.general.customer_name",
  "Tên khách hàng in hoa": "A.general.customer_name_uppercase",
  "Mã khách hàng": "A.general.customer_code",
  "Số ĐKKD": "A.general.business_registration_number",
  "Ngày cấp ĐKKD": "A.general.business_registration_date",
  "Nơi cấp ĐKKD": "A.general.business_registration_location",
  "Thay đổi ngày cấp ĐKKD": "A.general.business_registration_change_date",
  "Loại hình tổ chức": "A.general.organization_type",
  "Ngành nghề SXKD": "A.general.main_business",
  "Vốn điều lệ": "A.general.charter_capital",
  "VĐL bằng chữ": "A.general.charter_capital_in_words",
  "Địa chỉ": "A.general.address",
  "Địa bàn": "A.general.business_area",

  // A.management - Executive & Management Info
  "Người đại diện": "A.management.legal_representative_name",
  "Người đại diện theo pháp luật": "A.management.legal_representative_name",
  "Chức vụ": "A.management.legal_representative_title",
  "CMND": "A.management.legal_representative_id",
  "Ngày cấp": "A.management.id_issue_date",
  "Nơi cấp": "A.management.id_issue_location",
  "Năm sinh": "A.management.legal_representative_birth_year",
  "Số điện thoại": "A.management.phone_number",
  "Tên Chủ tịch HĐTV": "A.management.chairman_name",
  "Tên gọi Hội đồng": "A.management.board_name",
  "Nhiệm kỳ Chủ tịch HĐTV": "A.management.chairman_term",
  "Kế toán trưởng": "A.management.chief_accountant_name",
  "Tên kế toán trưởng": "A.management.chief_accountant_name",
  "Danh xưng": "A.management.title_prefix",

  // A.credit - Credit Contract Terms
  "Số HĐ tín dụng": "A.credit.current_credit_contract_number",
  "Số tiền vay": "A.proposal.loan_amount_agribank",
  "Dư nợ": "A.credit.outstanding_agri",
  "Ngày vay": "A.proposal.loan_start_date",
  "Hạn trả cuối cùng": "A.proposal.loan_maturity_date",
  "Lãi suất vay": "A.credit.current_interest_rate",
  "Mã sản phẩm TTTD": "A.credit.product_code",
  "Tên sản phẩm TTTD": "A.credit.product_name",

  // A.proposal - Loan Proposal & Purpose
  "Mục đích tra cứu CIC": "A.proposal.credit_inquiry_purpose",

  // A.collateral - Collateral Contract Details
  "Tên HĐ thế chấp": "A.collateral.collateral_contract_name",
  "Số HĐ thế chấp": "A.collateral.collateral_contract_number",
  "Ngày ký HĐTC": "A.collateral.collateral_contract_date",
  "Nơi đăng ký giao dịch BĐ": "A.collateral.registration_location",
  "Số HĐTC cũ": "A.collateral.old_contract_number",
  "Ngày ký HĐTC cũ": "A.collateral.old_contract_date",
  "Số BBĐG lại TS": "A.collateral.revaluation_certificate_number",
  "Ngày định giá lại TS": "A.collateral.revaluation_date",
  "HĐ sửa đổi bổ sung số": "A.collateral.amendment_contract_number",
  "Ngày ký HĐ SĐBS": "A.collateral.amendment_contract_date",
  "Văn bản sửa đổi, bổ sung": "A.collateral.amendment_document_text",

  // A.economic_docs - Economic Documents (supporting docs)
  "Loại giấy tờ pháp lý": "A.economic_docs.legal_document_type",
  "Loại giấy tờ tùy thân": "A.economic_docs.id_document_type",
  "Giấy tờ ủy quyền": "A.economic_docs.power_of_attorney",
  "Đăng ký kinh doanh số": "A.economic_docs.business_registration_detail",

  // Banking & Other Info
  "Nơi mở tài khoản": "A.credit.bank_account_location",
  "Số tài khoản": "A.credit.bank_account_number",
  "Số giải ngân": "A.proposal.disbursement_number",
};

// Reverse map: framework key → BK Vietnamese label (first match wins)
export const FRAMEWORK_TO_BK_LABEL: Record<string, string> = {};
for (const [bkKey, fwKey] of Object.entries(BK_TO_FRAMEWORK_MAPPING)) {
  if (!FRAMEWORK_TO_BK_LABEL[fwKey]) {
    FRAMEWORK_TO_BK_LABEL[fwKey] = bkKey;
  }
}
