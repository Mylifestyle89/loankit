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
  "CMND": "A.general.cccd",
  "Ngày cấp": "A.management.id_issue_date",
  "Nơi cấp": "A.management.id_issue_location",
  "Năm sinh": "A.general.date_of_birth",
  "Số điện thoại": "A.general.phone",
  "Tên Chủ tịch HĐTV": "A.management.chairman_name",
  "Tên gọi Hội đồng": "A.management.board_name",
  "Nhiệm kỳ Chủ tịch HĐTV": "A.management.chairman_term",
  "Kế toán trưởng": "A.management.chief_accountant_name",
  "Tên kế toán trưởng": "A.management.chief_accountant_name",
  "Danh xưng": "A.general.gender_prefix",

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

/**
 * Mapping cho ClientAssets → framework keys.
 * Key format: `{AssetCode}.{PropertyKey}` → framework field key.
 * AssetCode: HĐTD, SĐ, PA, GN, UNC, VBA, TCTD, TV
 */
export const BK_ASSET_MAPPING: Record<string, Record<string, string>> = {
  // HĐTD - Hợp đồng tín dụng
  "HĐTD": {
    "Số HĐ tín dụng": "A.credit.current_credit_contract_number",
    "Ngày ký HĐTD": "A.credit.contract_sign_date",
    "Số tiền vay": "A.proposal.loan_amount_agribank",
    "Bằng chữ": "A.proposal.loan_amount_in_words",
    "Mục đích vay": "A.proposal.loan_purpose",
    "Thời hạn vay": "A.proposal.loan_tenor_or_limit_term",
    "Hạn trả cuối": "A.proposal.loan_maturity_date",
    "Phương thức cho vay": "A.credit.lending_method",
    "Lãi suất vay": "A.credit.current_interest_rate",
    "Phương thức áp dụng LS": "A.credit.interest_rate_method",
    "Lãi suất quá hạn": "A.credit.overdue_interest_rate",
    "Lãi suất chậm trả": "A.credit.late_payment_interest_rate",
    "Định kỳ trả gốc": "A.credit.principal_repayment_schedule",
    "Định kỳ trả lãi": "A.credit.interest_repayment_schedule",
    "Tổng nhu cầu vốn": "A.proposal.total_credit_demand",
    "TNCV bằng chữ": "A.proposal.total_credit_demand_in_words",
    "Vốn đối ứng": "A.proposal.counterpart_capital",
    "Tỷ lệ vốn đối ứng": "A.proposal.counterpart_capital_ratio",
    "Tổng doanh thu dự kiến": "A.proposal.estimated_revenue",
    "Tổng chi phí dự kiến": "A.proposal.estimated_cost",
    "Lợi nhuận dự kiến": "A.proposal.estimated_profit",
    "Xếp hạng khách hàng": "A.credit.rating_agribank",
    "Nhóm nợ": "A.credit.debt_group_latest",
    "Kỳ chấm điểm": "A.credit.rating_date",
    "Dư nợ tại Agribank": "A.credit.outstanding_agri",
    "Dư nợ tại TCTD khác": "A.credit.outstanding_other_banks",
    "Số tiền vay có TSBĐ": "A.credit.secured_loan_amount",
    "Số tiền vay không có TSBĐ": "A.credit.unsecured_loan_amount",
    "Tỷ lệ % bảo đảm": "A.credit.collateral_coverage_ratio",
    "Tổng giá trị TSBĐ": "A.collateral.total_collateral_value",
    "TGTTSBĐ bằng chữ": "A.collateral.total_collateral_value_in_words",
    "Tổng nghĩa vụ bảo đảm": "A.collateral.total_secured_obligation",
    "Tổng nghĩa vụ bảo đảm tối đa": "A.collateral.max_secured_obligation",
    "Tên chi nhánh": "A.general.branch_name",
    "Chương trình cho vay 1": "A.credit.lending_program_1",
    "Chương trình cho vay 2": "A.credit.lending_program_2",
    "Chương trình cho vay 3": "A.credit.lending_program_3",
    "Chương trình cho vay 4": "A.credit.lending_program_4",
    "Tài chính minh bạch, LM": "A.credit.financial_transparency",
    "Lý do đáp ứng/không đáp ứng TCMBLM": "A.credit.transparency_reason",
    "Phí trả nợ trước hạn": "A.credit.early_repayment_fee",
    "Phí khác (nếu có)": "A.credit.other_fees",
    "Từ phương án, dự án": "A.proposal.revenue_from_plan",
    "Thu nhập khác": "A.proposal.other_income",
    "Dư nợ của NLQ tại Agribank": "A.credit.related_party_outstanding",
    "Dư nợ của KH và NLQ tại Agribank": "A.credit.customer_and_related_outstanding",
    "Tr.đó: Vốn bằng tiền": "A.proposal.cash_equity",
    "Vốn bằng sức lao động": "A.proposal.labor_equity",
    "Vốn vay TCTD khác": "A.proposal.other_bank_loan",
    "Vốn bằng tài sản khác": "A.proposal.other_asset_equity",
    "Ngày vay": "A.proposal.loan_start_date",
    "Ngày giao/nhận": "A.credit.handover_date",
    "Giấy tờ ủy quyền": "A.economic_docs.power_of_attorney",
    "Kiểu thời hạn": "A.credit.loan_term_unit",
    "VĐƯ bằng chữ": "A.proposal.counterpart_capital_in_words",
    "Áp dụng lãi suất cho vay ngắn hạn tối đa": "A.credit.max_short_term_rate_applied",
    "Lý do áp dụng/không áp dụng LSCVTĐ": "A.credit.max_rate_reason",
    "Phí trả nợ trong ngày": "A.credit.same_day_repayment_fee",
    "Phí cam kết rút vốn": "A.credit.commitment_fee",
    "Phí hủy bỏ cam kết rút vốn": "A.credit.cancellation_fee",
  },

  // SĐ - Quyền sử dụng đất
  "SĐ": {
    "Tên chủ sở hữu TS": "A.collateral.land_owner_name",
    "Tên chủ sở hữu TS in hoa": "A.collateral.land_owner_name_uppercase",
    "Tên TSBĐ": "A.collateral.collateral_name",
    "Tên Giấy chứng nhận": "A.collateral.certificate_name",
    "Số seri": "A.collateral.certificate_serial",
    "Địa chỉ đất": "A.collateral.land_address",
    "Diện tích đất": "A.collateral.land_area",
    "DTĐ bằng chữ": "A.collateral.land_area_in_words",
    "Số thửa": "A.collateral.plot_number",
    "Số tờ bản đồ": "A.collateral.map_sheet_number",
    "Mục đích sử dụng": "A.collateral.land_purpose",
    "Loại đất 1": "A.collateral.land_type_1",
    "Đơn giá đất 1": "A.collateral.land_unit_price_1",
    "Giá trị đất 1": "A.collateral.land_value_1",
    "Loại đất 2": "A.collateral.land_type_2",
    "Đơn giá đất 2": "A.collateral.land_unit_price_2",
    "Giá trị đất 2": "A.collateral.land_value_2",
    "Sử dụng riêng": "A.collateral.private_use_area",
    "Sử dụng chung": "A.collateral.common_use_area",
    "Nguồn gốc": "A.collateral.land_origin",
    "Thời hạn sử dụng": "A.collateral.land_use_term",
    "Cơ quan cấp": "A.collateral.issuing_authority",
    "Cấp ngày": "A.collateral.certificate_issue_date",
    "Số vào sổ": "A.collateral.registry_number",
    "Giá trị đất": "A.collateral.land_total_value",
    "Giá trị nhà": "A.collateral.house_value",
    "Tổng giá trị TS": "A.collateral.total_asset_value",
    "TGTTS bằng chữ": "A.collateral.total_asset_value_in_words",
    "Tỷ lệ % cấp tín dụng tối đa đối với QSD đất": "A.collateral.max_credit_ratio_land",
    "Tỷ lệ % cấp tín dụng tối đa đối với TS GLVĐ": "A.collateral.max_credit_ratio_attached",
    "Nghĩa vụ bảo đảm tối đa": "A.collateral.max_obligation",
    "NVBĐTĐ bằng chữ": "A.collateral.max_obligation_in_words",
    "Nghĩa vụ bảo đảm": "A.collateral.obligation_amount",
    "NVBĐ bằng chữ": "A.collateral.obligation_in_words",
    "Tỷ lệ cho vay/Giá trị TS": "A.collateral.loan_to_value_ratio",
    "Hình thức sở hữu TSBĐ": "A.collateral.ownership_form",
    "Mối quan hệ giữa chủ sở hữu TS với bên vay": "A.collateral.owner_borrower_relationship",
    "Khái quát về lợi thế": "A.collateral.advantage_summary",
    "Tên HĐ thế chấp": "A.collateral.collateral_contract_name",
    "Số HĐ thế chấp": "A.collateral.collateral_contract_number",
    "Ngày ký HĐTC": "A.collateral.collateral_contract_date",
    "Nơi đăng ký giao dịch BĐ": "A.collateral.registration_location",
    "BBXĐ giá trị tài sản số": "A.collateral.asset_valuation_number",
    "Loại nhà ở": "A.collateral.house_type",
    "Diện tích XD": "A.collateral.construction_area",
    "Mục đích thẩm định TSBĐ": "A.collateral.appraisal_purpose",
    "Tình trạng sử dụng TS": "A.collateral.asset_usage_status",
    "Mua bảo hiểm TSBĐ": "A.collateral.insurance_status",
    "TSBĐ chính thức/bổ sung": "A.collateral.collateral_category",
    "Thời hạn XĐ lại GTTS": "A.collateral.revaluation_period",
    "Số HĐTC cũ": "A.collateral.old_contract_number",
    "Ngày ký HĐTC cũ": "A.collateral.old_contract_date",
  },

  // GN - Giải ngân
  "GN": {
    "Dư nợ hiện tại": "A.credit.current_outstanding",
    "DNHT bằng chữ": "A.credit.current_outstanding_in_words",
    "Số tiền nhận nợ": "A.proposal.disbursement_amount",
    "STNN bằng chữ": "A.proposal.disbursement_amount_in_words",
    "Mục đích": "A.proposal.disbursement_purpose",
    "Tài liệu chứng minh": "A.proposal.supporting_documents",
    "Tổng dư nợ": "A.credit.total_outstanding",
    "TDN bằng chữ": "A.credit.total_outstanding_in_words",
    "Chuyển khoản": "A.proposal.transfer_amount",
    "Tiền mặt": "A.proposal.cash_amount",
  },

  // UNC - Bên thụ hưởng
  "UNC": {
    "Khách hàng thụ hưởng": "A.economic_docs.beneficiary_name",
    "Số tài khoản": "A.economic_docs.beneficiary_account",
    "Nơi mở tài khoản": "A.economic_docs.beneficiary_bank",
    "Số tiền": "A.economic_docs.beneficiary_amount",
    "ST bằng chữ": "A.economic_docs.beneficiary_amount_in_words",
    "Nội dung": "A.economic_docs.transfer_content",
  },

  // PA - Phương án (dùng dynamic mapping — xem extractPlanAsset)

  // VBA - Dư nợ tại Agribank
  "VBA": {
    "Tên TCTD": "A.credit.vba_bank_name",
    "Nhóm nợ": "A.credit.vba_debt_group",
    "Tổng dư nợ": "A.credit.vba_total_outstanding",
    "Dư nợ ngắn hạn": "A.credit.vba_short_term_outstanding",
    "Dư nợ trung dài hạn": "A.credit.vba_long_term_outstanding",
  },

  // TCTD - Dư nợ tại các TCTD khác
  "TCTD": {
    "Tên TCTD": "A.credit.other_bank_name",
    "Nhóm nợ": "A.credit.other_debt_group",
    "Tổng dư nợ": "A.credit.other_total_outstanding",
    "Dư nợ ngắn hạn": "A.credit.other_short_term_outstanding",
    "Dư nợ trung dài hạn": "A.credit.other_long_term_outstanding",
  },

  // STK - Sổ Tiết kiệm / Giấy tờ có giá (cầm cố)
  "STK": {
    "Tên TSBĐ": "A.collateral.tk_name",
    "Số seri": "A.collateral.tk_serial",
    "Số giấy tờ": "A.collateral.tk_paper_number",
    "Loại giấy tờ có giá": "A.collateral.tk_paper_type",
    "Tổ chức phát hành": "A.collateral.tk_issuer",
    "Mệnh giá": "A.collateral.tk_face_value",
    "Kỳ hạn": "A.collateral.tk_term",
    "Số dư": "A.collateral.tk_balance",
    "Lãi suất": "A.collateral.tk_interest_rate",
    "Lãi suất gửi": "A.collateral.tk_interest_rate",
    "Ngày phát hành": "A.collateral.tk_issue_date",
    "Ngày đến hạn": "A.collateral.tk_maturity_date",
    "Mức vay tối đa": "A.collateral.tk_max_loan",
    "Giá trị tài sản": "A.collateral.tk_total_value",
    "GTTS bằng chữ": "A.collateral.tk_total_value_in_words",
    "Nghĩa vụ bảo đảm": "A.collateral.tk_obligation",
    "NVBĐ bằng chữ": "A.collateral.tk_obligation_in_words",
    "Loại tiền tệ": "A.collateral.tk_currency",
    "Số ngày vay": "A.collateral.tk_loan_days",
    "Ngày làm hồ sơ": "A.collateral.tk_application_date",
    "Số tiền lãi gửi": "A.collateral.tk_deposit_interest",
    "Tổng gốc và lãi gửi": "A.collateral.tk_total_principal_interest",
  },

  // TV - Thành viên (vợ/chồng) — đã xử lý riêng trong importer
  "TV": {
    "Họ và tên": "A.general.spouse_name",
    "CMND": "A.general.spouse_cccd",
    "Danh xưng": "A.general.spouse_gender_prefix",
    "Ngày cấp": "A.general.spouse_id_issue_date",
    "Nơi cấp": "A.general.spouse_id_issue_location",
    "Năm sinh": "A.general.spouse_year_of_birth",
    "Số điện thoại": "A.general.spouse_phone",
    "Địa chỉ hiện tại": "A.general.spouse_address",
    "Nơi thường trú": "A.general.spouse_permanent_address",
    "Mối quan hệ với KH vay": "A.general.spouse_relationship",
    "Loại giấy tờ tùy thân": "A.general.spouse_id_type",
    "Dư nợ tại Agribank": "A.general.spouse_outstanding_agri",
  },
};

/**
 * PA (Phương án) — dynamic mapping cho các chi phí có hậu tố _DG, _SL, _TT.
 * Trả về field key dạng: A.plan.{normalized_name}_{suffix}
 */
export function mapPlanPropertyKey(propertyKey: string): string | null {
  // Fields có mapping cố định trong PA
  const PA_FIXED: Record<string, string> = {
    "Tổng nhu cầu vốn": "A.plan.total_capital_demand",
    "Số tiền vay": "A.plan.loan_amount",
    "Vốn đối ứng": "A.plan.counterpart_capital",
    "Tỷ lệ vốn đối ứng": "A.plan.counterpart_ratio",
    "Mục đích vay": "A.plan.loan_purpose",
    "Thời hạn vay": "A.plan.loan_term",
    "Lãi suất vay": "A.plan.interest_rate",
    "Tổng doanh thu dự kiến": "A.plan.estimated_revenue",
    "Tổng chi phí dự kiến": "A.plan.estimated_cost",
    "Lợi nhuận dự kiến": "A.plan.estimated_profit",
    "Sản lượng": "A.plan.production_quantity",
    "Thu nhập": "A.plan.income_unit_price",
    "Lãi vay NH": "A.plan.bank_interest_cost",
    "Địa chỉ đất NN": "A.plan.farm_land_address",
    "Số sào đất": "A.plan.land_area_sao",
    "Số tiền hợp đồng cung ứng": "A.plan.supply_contract_amount",
    "Số tiền đặt cọc": "A.plan.deposit_amount",
    "Số tiền vay bằng chữ": "A.plan.loan_amount_in_words",
    "Tổng nhu cầu vốn bằng chữ": "A.plan.total_capital_in_words",
    "Số tiền hợp đồng cung ứng bằng chữ": "A.plan.supply_contract_in_words",
  };

  if (PA_FIXED[propertyKey]) return PA_FIXED[propertyKey];

  // Dynamic cost items: "Cây giống_DG" → A.plan.cay_giong_dg
  const suffixMatch = propertyKey.match(/^(.+?)_(DG|SL|TT)$/);
  if (suffixMatch) {
    const name = suffixMatch[1]
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const suffix = suffixMatch[2].toLowerCase();
    return `A.plan.${name}_${suffix}`;
  }

  return null;
}

// Reverse map: framework key → BK Vietnamese label (first match wins)
export const FRAMEWORK_TO_BK_LABEL: Record<string, string> = {};
for (const [bkKey, fwKey] of Object.entries(BK_TO_FRAMEWORK_MAPPING)) {
  if (!FRAMEWORK_TO_BK_LABEL[fwKey]) {
    FRAMEWORK_TO_BK_LABEL[fwKey] = bkKey;
  }
}
