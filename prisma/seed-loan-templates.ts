/**
 * Seed script: populate LoanPlanTemplate table with 6 category templates.
 * Cost items and default prices extracted from real PA files in report_assets/backups/phuong an/.
 *
 * Run: npx tsx prisma/seed-loan-templates.ts
 */
import { prisma } from "../src/lib/prisma";

type CostItemTemplate = { name: string; unit: string; default_price: number };
type RevenueTemplate = { description: string; formula_type: string };
type Defaults = { interest_rate: number; loan_term_months: number; tax_rate: number };

type TemplateData = {
  name: string;
  category: string;
  loan_type: string;
  description: string;
  cost_items: CostItemTemplate[];
  revenue_items: RevenueTemplate[];
  defaults: Defaults;
};

// ─── 1. Nông nghiệp (hoa/rau/cây ăn quả) ─────────────────────────────────
const nongNghiep: TemplateData = {
  name: "PA Trồng hoa - Cát tường",
  category: "nong_nghiep",
  loan_type: "tung_lan",
  description: "Trồng và chăm sóc hoa Cát tường, rau, cây ăn quả",
  cost_items: [
    { name: "Xử lý đất", unit: "m2", default_price: 16000 },
    { name: "Cây giống", unit: "cây", default_price: 3200 },
    { name: "Phân hữu cơ", unit: "m3", default_price: 1600000 },
    { name: "Đạm", unit: "kg", default_price: 18000 },
    { name: "Lân", unit: "kg", default_price: 4000 },
    { name: "KaLi", unit: "kg", default_price: 18000 },
    { name: "Phân vi sinh", unit: "kg", default_price: 10000 },
    { name: "NPK", unit: "kg", default_price: 20000 },
    { name: "Vôi", unit: "kg", default_price: 2000 },
    { name: "Thuốc BVTV", unit: "lít", default_price: 1500000 },
    { name: "Chi phí tưới", unit: "giờ", default_price: 70000 },
    { name: "Công lao động", unit: "công", default_price: 300000 },
  ],
  revenue_items: [{ description: "Sản lượng × Giá bán", formula_type: "yield_area" }],
  defaults: { interest_rate: 0.09, loan_term_months: 12, tax_rate: 0 },
};

// ─── 2. Kinh doanh bán lẻ ──────────────────────────────────────────────────
const kinhDoanh: TemplateData = {
  name: "PA Kinh doanh tạp hóa",
  category: "kinh_doanh",
  loan_type: "tung_lan",
  description: "Kinh doanh hàng hóa bán lẻ (tạp hóa, điện máy, may mặc...)",
  cost_items: [
    { name: "Hàng hóa nhập (bia, nước ngọt)", unit: "thùng", default_price: 250000 },
    { name: "Hàng hóa nhập (sữa, bánh kẹo)", unit: "thùng", default_price: 140000 },
    { name: "Hàng hóa nhập (mì, xà phòng)", unit: "thùng", default_price: 80000 },
    { name: "Hàng hóa nhập (thuốc lá)", unit: "cây", default_price: 230000 },
    { name: "Các loại hàng hóa khác", unit: "đồng", default_price: 0 },
    { name: "Chi phí quản lý, công lao động", unit: "đồng", default_price: 0 },
    { name: "Chi phí khác", unit: "đồng", default_price: 0 },
  ],
  revenue_items: [{ description: "Giá bán × Số lượng (biên LN ~15%)", formula_type: "margin" }],
  defaults: { interest_rate: 0.07, loan_term_months: 12, tax_rate: 0 },
};

// ─── 3. Chăn nuôi ──────────────────────────────────────────────────────────
const chanNuoi: TemplateData = {
  name: "PA Chăn nuôi gia cầm",
  category: "chan_nuoi",
  loan_type: "tung_lan",
  description: "Chăn nuôi gà, vịt, bò, heo",
  cost_items: [
    { name: "Con giống", unit: "con", default_price: 90000 },
    { name: "Thức ăn gia cầm các loại", unit: "đồng", default_price: 0 },
    { name: "Thuốc thú y", unit: "đồng", default_price: 0 },
    { name: "Chi phí chuồng trại", unit: "đồng", default_price: 0 },
    { name: "Chi phí công lao động, vận chuyển", unit: "đồng", default_price: 0 },
    { name: "Chi phí khác", unit: "đồng", default_price: 0 },
  ],
  revenue_items: [{ description: "Đầu con × Trọng lượng × Giá bán", formula_type: "livestock" }],
  defaults: { interest_rate: 0.07, loan_term_months: 12, tax_rate: 0 },
};

// ─── 4. Ăn uống / Dịch vụ ──────────────────────────────────────────────────
const anUong: TemplateData = {
  name: "PA Kinh doanh ăn uống",
  category: "an_uong",
  loan_type: "tung_lan",
  description: "Nhà hàng, quán ăn, cà phê, dịch vụ ăn uống",
  cost_items: [
    { name: "Nguyên liệu tươi sống", unit: "đồng", default_price: 0 },
    { name: "Bia, nước ngọt các loại", unit: "đồng", default_price: 0 },
    { name: "Gia vị, phụ liệu", unit: "đồng", default_price: 0 },
    { name: "Chi phí nhân sự", unit: "đồng", default_price: 0 },
    { name: "Điện, nước, gas, internet", unit: "đồng", default_price: 0 },
    { name: "Marketing & hoa hồng lữ hành", unit: "đồng", default_price: 0 },
    { name: "Khấu hao & bảo trì", unit: "đồng", default_price: 0 },
    { name: "Chi phí khác", unit: "đồng", default_price: 0 },
  ],
  revenue_items: [{ description: "Công suất × Giá TB × Ngày × Tỷ lệ lấp đầy", formula_type: "capacity" }],
  defaults: { interest_rate: 0.075, loan_term_months: 12, tax_rate: 0.03 },
};

// ─── 5. Xây dựng / Sửa nhà ─────────────────────────────────────────────────
const xayDung: TemplateData = {
  name: "PA Sửa chữa nhà ở",
  category: "xay_dung",
  loan_type: "tieu_dung",
  description: "Xây dựng, sửa chữa nhà ở (tiêu dùng có TSBĐ)",
  cost_items: [
    { name: "Hạng mục đập phá, tháo dỡ", unit: "m2", default_price: 75000 },
    { name: "Hạng mục xây tô", unit: "m2", default_price: 165000 },
    { name: "Ốp lát, gạch nền", unit: "m2", default_price: 305000 },
    { name: "Sơn nước + chống thấm", unit: "m2", default_price: 65000 },
    { name: "Cửa sổ, cửa đi, lan can", unit: "m2", default_price: 2050000 },
    { name: "Hệ thống điện, nước", unit: "m2", default_price: 310000 },
    { name: "Đóng trần, la phông", unit: "m2", default_price: 1100000 },
    { name: "Thiết bị vệ sinh", unit: "bộ", default_price: 15000000 },
  ],
  revenue_items: [{ description: "Thu nhập hàng tháng (lương/SXNN)", formula_type: "income" }],
  defaults: { interest_rate: 0.09, loan_term_months: 60, tax_rate: 0 },
};

// ─── 6. Hạn mức nông sản ───────────────────────────────────────────────────
const hanMuc: TemplateData = {
  name: "PA Hạn mức kinh doanh nông sản",
  category: "han_muc",
  loan_type: "han_muc",
  description: "Kinh doanh nông sản theo hạn mức (quay vòng vốn)",
  cost_items: [
    { name: "Nông sản mặt hàng 1", unit: "kg", default_price: 50000 },
    { name: "Nông sản mặt hàng 2", unit: "kg", default_price: 22000 },
    { name: "Nông sản mặt hàng 3", unit: "kg", default_price: 17000 },
    { name: "Nông sản mặt hàng 4", unit: "kg", default_price: 9000 },
    { name: "Nông sản mặt hàng 5", unit: "kg", default_price: 22000 },
    { name: "Các loại khác", unit: "đồng", default_price: 0 },
    { name: "Công lao động", unit: "công/tháng", default_price: 6000000 },
    { name: "Chi phí vận chuyển, chi phí khác", unit: "đồng", default_price: 20000000 },
  ],
  revenue_items: [{ description: "SL bán × Giá bán (hao hụt 10%, vòng quay 2)", formula_type: "turnover" }],
  defaults: { interest_rate: 0.07, loan_term_months: 12, tax_rate: 0 },
};

// ─── 7. Nhà kính nông nghiệp (trung dài hạn, có khấu hao) ─────────────────
const nhaKinh: TemplateData = {
  name: "PA Dựng nhà kính trồng hoa",
  category: "nong_nghiep",
  loan_type: "trung_dai",
  description: "Dựng nhà kính trồng hoa Cát tường (vay trung dài hạn, có khấu hao)",
  cost_items: [
    { name: "Xử lý đất", unit: "m2", default_price: 16000 },
    { name: "Cây giống", unit: "cây", default_price: 3200 },
    { name: "Phân hữu cơ", unit: "m3", default_price: 1600000 },
    { name: "Đạm", unit: "kg", default_price: 18000 },
    { name: "Lân", unit: "kg", default_price: 4000 },
    { name: "KaLi", unit: "kg", default_price: 18000 },
    { name: "Phân vi sinh", unit: "kg", default_price: 10000 },
    { name: "NPK", unit: "kg", default_price: 20000 },
    { name: "Vôi", unit: "kg", default_price: 2000 },
    { name: "Thuốc BVTV", unit: "lít", default_price: 1500000 },
    { name: "Chi phí tưới", unit: "giờ", default_price: 70000 },
    { name: "Công lao động", unit: "công", default_price: 300000 },
  ],
  revenue_items: [{ description: "Sản lượng × Giá bán", formula_type: "yield_area" }],
  defaults: { interest_rate: 0.085, loan_term_months: 96, tax_rate: 0 },
};

const ALL_TEMPLATES = [nongNghiep, kinhDoanh, chanNuoi, anUong, xayDung, hanMuc, nhaKinh];

async function main() {
  console.log("Seeding loan plan templates...");

  for (const tpl of ALL_TEMPLATES) {
    const existing = await prisma.loanPlanTemplate.findFirst({
      where: { name: tpl.name },
    });

    if (existing) {
      console.log(`  [skip] ${tpl.name} — already exists`);
      continue;
    }

    await prisma.loanPlanTemplate.create({
      data: {
        name: tpl.name,
        category: tpl.category,
        description: tpl.description,
        cost_items_template_json: JSON.stringify(tpl.cost_items),
        revenue_template_json: JSON.stringify(tpl.revenue_items),
        defaults_json: JSON.stringify({
          ...tpl.defaults, loan_type: tpl.loan_type,
          // Extended defaults for trung_dai templates
          ...(tpl.loan_type === "trung_dai" ? { depreciation_years: 8, asset_unit_price: 270000000, preferential_rate: 0.075 } : {}),
        }),
      },
    });

    console.log(`  [created] ${tpl.category} — ${tpl.name} (${tpl.cost_items.length} cost items)`);
  }

  console.log(`Done! ${ALL_TEMPLATES.length} templates seeded.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void 0);
