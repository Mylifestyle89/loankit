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

// Extended fields for trung_dai (medium-long term) loan plans
export type LoanPlanFinancialsExtended = LoanPlanFinancials & {
  depreciation_years?: number;         // Số năm khấu hao (e.g., 8)
  asset_unit_price?: number;           // Đơn giá tài sản/sào (e.g., 270,000,000)
  land_area_sau?: number;              // Số sào đất
  construction_contract_no?: string;   // Số HĐ thi công
  construction_contract_date?: string; // Ngày HĐ thi công
  preferential_rate?: number;          // Lãi suất ưu đãi năm đầu (e.g., 0.075)
  term_months?: number;                // Thời hạn vay (tháng)
  farmAddress?: string;                // Địa chỉ đất NN
};

export type RepaymentRow = {
  year: number;           // Năm thứ
  income: number;         // Thu nhập trả nợ = profit + depreciation
  balance: number;        // Dư nợ đầu kỳ
  principal: number;      // Gốc trả
  interest: number;       // Lãi trả
  remaining: number;      // TN còn lại = income - principal - interest
};

export type LoanMethod = "tung_lan" | "han_muc" | "trung_dai" | "tieu_dung";
export type LoanPlanStatus = "draft" | "approved";
