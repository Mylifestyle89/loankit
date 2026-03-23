import type { FieldCatalogItem } from "@/lib/report/config-schema";

const GROUP_LABEL_VI_BY_KEY: Record<string, string> = {
  "A.general": "Thông tin chung",
  "A.credit": "Thông tin tín dụng",
  "A.proposal": "Đề xuất vay vốn",
  "A.management": "Quản trị điều hành",
  "A.economic_docs": "Hồ sơ kinh tế",
  "A.collateral": "Tài sản bảo đảm",
  "B.financial": "Phân tích tài chính",
  "A.plan": "Phương án vay vốn",
  "B.plan": "Kế hoạch hạn mức",
  "B.risk": "Đánh giá rủi ro",
};

const FIELD_LABEL_VI_BY_KEY: Record<string, string> = {
  "A.general.customer_name": "Tên khách hàng",
  "A.general.customer_code": "Mã khách hàng",
  "A.general.address": "Địa chỉ",
  "A.general.main_business": "Ngành nghề kinh doanh chính",
  "A.general.charter_capital": "Vốn điều lệ",
  "A.general.legal_representative_name": "Người đại diện pháp luật",
  "A.general.legal_representative_title": "Chức vụ người đại diện",
  "A.general.organization_type": "Loại hình tổ chức",
  "A.general.total_assets_latest": "Tổng tài sản kỳ gần nhất",
  "A.general.owner_equity_latest": "Vốn chủ sở hữu kỳ gần nhất",
  "A.credit.current_credit_relationship": "Quan hệ tín dụng hiện tại",
  "A.credit.outstanding_agri": "Dư nợ tại Agribank",
  "A.credit.outstanding_other_banks": "Dư nợ tại tổ chức tín dụng khác",
  "A.credit.debt_group_latest": "Nhóm nợ gần nhất",
  "A.credit.rating_agribank": "Xếp hạng tại Agribank",
  "A.credit.rating_cic": "Xếp hạng CIC",
  "A.credit.product_name": "Tên sản phẩm TTTD",
  "A.credit.product_code": "Mã sản phẩm TTTD",
  "A.proposal.loan_purpose": "Mục đích vay",
  "A.proposal.loan_tenor_or_limit_term": "Thời hạn vay/hạn mức",
  "A.proposal.loan_amount_agribank": "Số tiền vay tại Agribank",
  "A.proposal.total_credit_demand": "Tổng nhu cầu cấp tín dụng",
  "A.management.executive_team": "Ban lãnh đạo",
  "A.management.major_shareholders": "Cổ đông/thành viên chính",
  "A.management.related_parties": "Người liên quan",
  "A.economic_docs.invoices": "Hóa đơn",
  "A.economic_docs.payment_beneficiaries": "Bên thụ hưởng thanh toán",
  "A.economic_docs.invoice_total_for_disbursement": "Tổng giá trị hóa đơn giải ngân",
  "B.financial.balance_sheet.short_term_assets": "Tài sản ngắn hạn",
  "B.financial.balance_sheet.long_term_assets": "Tài sản dài hạn",
  "B.financial.balance_sheet.short_term_liabilities": "Nợ ngắn hạn",
  "B.financial.income_statement.revenue": "Doanh thu thuần",
  "B.financial.income_statement.gross_profit": "Lợi nhuận gộp",
  "B.financial.income_statement.profit_before_tax": "Lợi nhuận trước thuế",
  "B.financial.ratios.current_ratio": "Hệ số khả năng thanh toán hiện hành",
  "B.financial.ratios.quick_ratio": "Hệ số khả năng thanh toán nhanh",
  "B.financial.ratios.cash_ratio": "Hệ số khả năng thanh toán tức thời",
  "B.financial.ratios.interest_coverage": "Hệ số khả năng thanh toán lãi vay",
  "B.financial.ratios.equity_ratio": "Hệ số tự tài trợ",
  "B.financial.ratios.debt_to_equity": "Hệ số nợ trên vốn chủ sở hữu",
  "B.financial.ratios.working_capital_turnover": "Vòng quay vốn lưu động",
  "B.financial.ratios.inventory_turnover": "Vòng quay hàng tồn kho",
  "B.financial.ratios.receivables_turnover": "Vòng quay khoản phải thu",
  "B.financial.ratios.fixed_asset_turnover": "Vòng quay tài sản cố định",
  "B.financial.ratios.total_asset_turnover": "Vòng quay tổng tài sản",
  "B.financial.ratios.ros": "Tỷ suất lợi nhuận biên (ROS)",
  "B.financial.ratios.roa": "Khả năng sinh lời tài sản (ROA)",
  "B.financial.ratios.roe": "Khả năng sinh lời VCSH (ROE)",
  "B.financial.ratios.bep": "Tỷ số sinh lời cơ sở (BEP)",
  "B.financial.cdkt.assets_current": "Phân tích Tài sản ngắn hạn",
  "B.financial.cdkt.assets_noncurrent": "Phân tích Tài sản dài hạn",
  "B.financial.cdkt.liabilities": "Phân tích Nợ phải trả",
  "B.financial.cdkt.equity": "Phân tích Vốn chủ sở hữu",
  "B.financial.cdkt.summary": "Tổng kết phân tích Bảng CĐKT",
  "B.financial.kqkd.revenue": "Phân tích Doanh thu và Giá vốn",
  "B.financial.kqkd.expenses": "Phân tích Chi phí hoạt động",
  "B.financial.kqkd.profit": "Phân tích Lợi nhuận",
  "B.financial.kqkd.summary": "Tổng kết phân tích KQKD",
  "B.financial.summary": "Tổng kết phân tích tài chính",
  "B.plan.hmtd.working_capital_plan": "Vốn lưu động kế hoạch",
  "B.plan.hmtd.counterpart_capital": "Vốn đối ứng",
  "B.plan.hmtd.other_bank_loans": "Vốn vay tại tổ chức tín dụng khác",
  "B.plan.hmtd.recommended_limit": "Hạn mức đề xuất",
  "A.collateral.assets": "Danh mục tài sản bảo đảm",
  "A.collateral.total_collateral_value": "Tổng giá trị tài sản bảo đảm",
  "A.collateral.secured_obligation_total": "Tổng nghĩa vụ được bảo đảm",
  "A.collateral.insurance_status": "Tình trạng bảo hiểm tài sản bảo đảm",
  "B.risk.market_input_output_assessment": "Đánh giá đầu vào đầu ra thị trường",
  "B.risk.mitigation_plan": "Phương án giảm thiểu rủi ro",
};

function legacyEnglishLabelFromKey(fieldKey: string): string {
  const last = fieldKey.split(".").at(-1) ?? fieldKey;
  return last
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function fallbackVietnameseLabel(fieldKey: string): string {
  const legacy = legacyEnglishLabelFromKey(fieldKey);
  const tokenMap: Record<string, string> = {
    customer: "khách hàng",
    name: "tên",
    code: "mã",
    address: "địa chỉ",
    legal: "pháp lý",
    representative: "đại diện",
    title: "chức vụ",
    organization: "tổ chức",
    type: "loại",
    total: "tổng",
    assets: "tài sản",
    owner: "chủ",
    equity: "vốn",
    latest: "gần nhất",
    credit: "tín dụng",
    relationship: "quan hệ",
    outstanding: "dư nợ",
    debt: "nợ",
    group: "nhóm",
    rating: "xếp hạng",
    loan: "vay",
    purpose: "mục đích",
    tenor: "kỳ hạn",
    limit: "hạn mức",
    amount: "số tiền",
    proposal: "đề xuất",
    collateral: "bảo đảm",
    value: "giá trị",
    insurance: "bảo hiểm",
    status: "trạng thái",
    financial: "tài chính",
    ratio: "tỷ số",
    revenue: "doanh thu",
    profit: "lợi nhuận",
    before: "trước",
    tax: "thuế",
    short: "ngắn hạn",
    long: "dài hạn",
  };

  return legacy
    .split(" ")
    .map((token) => tokenMap[token.toLowerCase()] ?? token.toLowerCase())
    .join(" ")
    .replace(/^\w/, (char) => char.toUpperCase());
}

export function translateFieldLabelVi(fieldKey: string): string {
  return FIELD_LABEL_VI_BY_KEY[fieldKey] ?? fallbackVietnameseLabel(fieldKey);
}

export function translateGroupVi(groupKey: string): string {
  return GROUP_LABEL_VI_BY_KEY[groupKey] ?? groupKey;
}

export function normalizeFieldCatalogLabelsVi(catalog: FieldCatalogItem[]): {
  catalog: FieldCatalogItem[];
  changed: boolean;
} {
  let changed = false;
  const next = catalog.map((item) => {
    const translated = translateFieldLabelVi(item.field_key);
    const legacy = legacyEnglishLabelFromKey(item.field_key);
    const shouldReplace = !item.label_vi || item.label_vi === legacy || item.label_vi.trim() === "";
    if (shouldReplace && item.label_vi !== translated) {
      changed = true;
      return { ...item, label_vi: translated };
    }
    return item;
  });
  return { catalog: next, changed };
}

export function normalizeFieldCatalogGroupsVi(catalog: FieldCatalogItem[]): {
  catalog: FieldCatalogItem[];
  changed: boolean;
} {
  let changed = false;
  const next = catalog.map((item) => {
    const translatedGroup = translateGroupVi(item.group);
    if (translatedGroup !== item.group) {
      changed = true;
      return { ...item, group: translatedGroup };
    }
    return item;
  });
  return { catalog: next, changed };
}
