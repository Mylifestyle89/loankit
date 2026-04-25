## Phase 8: Seed PA Templates from Real Data

**Priority:** P2 | **Status:** pending | **Effort:** 4h | **Depends:** Phase 6

### Context
- 35 real PA files in `report_assets/backups/phuong an/`
- 6 categories identified
- `Định mức KTKT 2022.xls` contains default unit prices

### Requirements
- Parse real PA files to extract cost item patterns per category
- Parse Dinh muc KTKT 2022.xls for default prices
- Create seed script that populates LoanPlanTemplate table

### 6 Templates to Seed

1. **Nông nghiệp** (hoa/rau/cây ăn quả)
   - 40+ cost items: giống, phân, thuốc, nhân công, vật tư
   - Pattern: DG (đơn giá) × SL (số lượng) = TT (thành tiền)
   - Default prices from KTKT 2022

2. **Kinh doanh bán lẻ**
   - Fewer cost items: hàng hóa, mặt bằng, nhân viên
   - Revenue: sản phẩm × biên lợi nhuận

3. **Chăn nuôi**
   - Hybrid: thức ăn, thuốc thú y, con giống, chuồng trại
   - Revenue: đầu con × trọng lượng × giá

4. **Ăn uống/dịch vụ**
   - Nguyên liệu, nhân công, mặt bằng, điện nước
   - Revenue: công suất × giá TB × ngày × tỷ lệ lấp đầy

5. **Xây dựng/sửa nhà**
   - Minimal cost tracking (income-based repayment)
   - Revenue = monthly income

6. **Hạn mức nông sản**
   - Same as nông nghiệp costs + turnover cycles + wastage rate
   - loan_type: "han_muc"

### Implementation Steps

1. **Parse Dinh muc KTKT 2022.xls**
   - Use existing xlsx import infrastructure or simple script
   - Extract: item name, unit, default price
   - Save as JSON for seed script

2. **Analyze sample PA files per category**
   - Extract cost item names + units from 2-3 samples per category
   - Build template JSON structure

3. **Create seed script**: `prisma/seed-loan-templates.ts`
   ```ts
   // For each category:
   await prisma.loanPlanTemplate.create({
     data: {
       name: "PA Trồng hoa - Cát tường",
       category: "nong_nghiep",
       loan_type: "tung_lan",
       cost_items_template_json: JSON.stringify([
         { name: "Giống hoa", unit: "cây", default_price: 5000 },
         { name: "Phân NPK", unit: "kg", default_price: 12000 },
         // ... from KTKT 2022
       ]),
       revenue_template_json: JSON.stringify([
         { description: "Doanh thu bán hoa", formula_type: "yield_area" }
       ]),
       defaults_json: JSON.stringify({
         interest_rate: 0.06,
         loan_term_months: 12,
         tax_rate: 0
       })
     }
   });
   ```

4. **Add to package.json scripts**
   - `"seed:templates": "npx tsx prisma/seed-loan-templates.ts"`

### Related Files
- `report_assets/backups/phuong an/` (read-only, source data)
- `report_assets/backups/phuong an/Định mức KTKT 2022.xls` (default prices)
- `prisma/seed-loan-templates.ts` (new)

### Success Criteria
- 6+ templates seeded in DB
- Each template has realistic cost items with KTKT default prices
- Templates usable immediately in Loan Plan Builder UI
