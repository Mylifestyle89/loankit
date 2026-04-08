// Types for Loan Plan Builder (Phương án vay vốn)

export type CostItem = {
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  amount: number;
};

export type RevenueItem = {
  description: string;
  unit?: string;  // ĐVT (e.g. "kg", "đ") — optional, defaults to "đ" in builder
  qty: number;
  unitPrice: number;
  amount: number;
};

export type LoanPlanFinancials = {
  totalDirectCost: number;
  interestRate: number; // annual rate, e.g. 0.09 for 9%
  turnoverCycles: number; // Vòng quay vốn
  interest: number; // Lãi vay = loanAmount * interestRate
  tax: number; // Thuế (editable)
  totalIndirectCost: number; // Tổng chi phí gián tiếp = interest + tax
  totalCost: number; // totalDirectCost + totalIndirectCost
  revenue: number;
  profit: number;
  loanNeed: number; // Nhu cầu vốn vay = totalDirectCost / turnoverCycles
  loanAmount: number;
  counterpartCapital: number; // = loanNeed - loanAmount
};

// Revenue inputs per category
export type NongNghiepRevenue = {
  yield_per_unit: number; // kg/sao or kg/ha
  area: number;
  price: number; // price per kg
};

export type KinhDoanhRevenue = {
  product_count: number;
  margin: number; // margin per product per day
  days: number; // working days per month
};

export type ChanNuoiRevenue = {
  head_count: number;
  weight: number; // kg per head
  price_per_kg: number;
};

export type AnUongRevenue = {
  capacity: number; // seats or tables
  avg_ticket: number; // average spend per customer
  days: number; // operating days per month
  occupancy: number; // 0.0 - 1.0
};

export type XayDungRevenue = {
  monthly_income: number;
};

export type HanMucRevenue = {
  turnover_cycles: number;
  capital: number;
  margin: number; // margin per cycle
};

export type CategoryRevenue =
  | ({ category: "nong_nghiep" } & NongNghiepRevenue)
  | ({ category: "kinh_doanh" } & KinhDoanhRevenue)
  | ({ category: "chan_nuoi" } & ChanNuoiRevenue)
  | ({ category: "an_uong" } & AnUongRevenue)
  | ({ category: "xay_dung" } & XayDungRevenue)
  | ({ category: "han_muc" } & HanMucRevenue);

export type LoanPlanCategory =
  | "nong_nghiep"
  | "kinh_doanh"
  | "chan_nuoi"
  | "an_uong"
  | "xay_dung"
  | "han_muc";

/** Nguồn thu nhập chính dùng để trả nợ (đồng bộ với zod INCOME_SOURCE_TYPES) */
export type IncomeSourceType = "salary" | "rental" | "agriculture" | "business";

// Extended fields for trung_dai (medium-long term) loan plans
export type LoanPlanFinancialsExtended = LoanPlanFinancials & {
  depreciation_years?: number;         // Số năm khấu hao (e.g., 8)
  asset_unit_price?: number;           // Đơn giá tài sản/sào (e.g., 270,000,000)
  land_area_sau?: number;              // Số sào đất
  construction_contract_no?: string;   // Số HĐ thi công
  construction_contract_date?: string; // Ngày HĐ thi công
  preferential_rate?: number;          // Lãi suất ưu đãi năm đầu (e.g., 0.075)
  term_months?: number;                // Thời hạn vay (tháng)
  repayment_frequency?: number;        // Kỳ hạn trả gốc (tháng): 1, 3, 6, 12
  principal_rounding?: "none" | "up_100k" | "down_100k"; // Làm tròn gốc mỗi kỳ (kỳ cuối tự điều chỉnh)
  farmAddress?: string;                // Địa chỉ đất NN
  income_source_type?: IncomeSourceType; // Nguồn thu nhập chính trả nợ (chuẩn bị cho bộ hồ sơ tiêu dùng)

  // ── Tiêu dùng (consumer loan) fields ──
  /** Mục đích vay tiêu dùng: xây/sửa nhà, mua đất ở, mua xe. "mua_sam" scope riêng. */
  tieu_dung_subtype?: TieuDungSubtype;
  /** Tổng nhu cầu vốn vay (user nhập trực tiếp cho tiêu dùng — không tính từ cost items) */
  loan_capital_need?: number;
  // Người trả nợ 1 (KH)
  earner1_title?: EarnerTitle;
  earner1_name?: string;
  earner1_workplace?: string;
  earner1_monthly_income?: number;
  // Người trả nợ 2 (vợ/chồng — optional)
  earner2_title?: EarnerTitle;
  earner2_name?: string;
  earner2_workplace?: string;
  earner2_monthly_income?: number;
  // Chi phí bình quân 1 kỳ (kỳ = repayment_frequency tháng — dynamic)
  living_expenses_period?: number;     // Chi phí sinh hoạt mỗi kỳ
  avg_other_loan_rate?: number;        // Lãi suất BQ (dùng ước tính chi phí lãi của khoản vay này)
  other_costs_period?: number;         // Chi phí khác mỗi kỳ (các khoản vay khác, ...)
};

export type RepaymentRow = {
  period: number;         // Kỳ thứ (1, 2, 3...)
  year: number;           // Năm thứ (backward compat)
  periodLabel: string;    // "Năm 1", "Kỳ 3", "Tháng 6"...
  income: number;         // Thu nhập trả nợ (pro-rata theo kỳ)
  balance: number;        // Dư nợ đầu kỳ
  principal: number;      // Gốc trả
  interest: number;       // Lãi trả
  remaining: number;      // TN còn lại = income - principal - interest
};

/** Kỳ hạn trả gốc (tháng) */
export type RepaymentFrequency = 1 | 3 | 6 | 12;

export type LoanMethod = "tung_lan" | "han_muc" | "trung_dai" | "tieu_dung";

/** Mục đích vay tiêu dùng. "mua_sam" (mua sắm vật dụng) hiện chưa implement — scope riêng. */
export type TieuDungSubtype = "xay_sua_nha" | "mua_dat" | "mua_xe" | "mua_sam";

/** Danh xưng người trả nợ */
export type EarnerTitle = "Ông" | "Bà";
export type LoanPlanStatus = "draft" | "approved";
