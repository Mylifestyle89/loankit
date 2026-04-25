## Phase 9: Loan Method Workflow

**Priority:** P2 | **Status:** pending | **Effort:** 5h | **Depends:** Phase 5

### Context
4 phương thức cho vay KHCN, mỗi loại có bộ mẫu biểu DOCX riêng + AssetCategories riêng.

### 4 Loan Methods

| Method | loan_method | HĐTD mẫu | PA type |
|--------|------------|-----------|---------|
| Vay từng lần ngắn hạn | `tung_lan_ngan_han` | 2268.06E | SXKD |
| Vay theo hạn mức | `han_muc` | 2268.06A | SXKD |
| Vay trung/dài hạn | `trung_dai_han` | 2268.06E | SXKD |
| Tiêu dùng có TSBĐ | `tieu_dung` | 2268.06E | Thu nhập |

### AssetCategories by method

| Code | Mô tả | Từng lần | Hạn mức | T/D hạn | Tiêu dùng |
|------|-------|:---:|:---:|:---:|:---:|
| UNC | Thụ hưởng | ✅ | ✅ | ✅ | ✅ |
| GN | Giải ngân | ✅ | ✅ | ✅ | ✅ |
| HĐTD | HĐ tín dụng | ✅ | ✅ | ✅ | ✅ |
| PA | Phương án | ✅ | ✅ | ✅ | ❌ |
| SĐ | QSD đất | ✅ | ✅ | ✅ | ✅ |
| TV | Thành viên | ✅ | ✅ | ✅ | ✅ |
| VBA | Dư nợ Agribank | ✅ | ✅ | ❌ | ❌ |
| TCTD | Dư nợ TCTD | ✅ | ✅ | ❌ | ❌ |
| NLQ | Người liên quan | ❌ | ✅ | ✅ | ✅ |
| ĐS | Động sản | ❌ | ✅ | ✅ | ✅ |

### Implementation Steps

1. **Add `loan_method` to Loan model** (or new LoanCase model)
   - Enum: tung_lan_ngan_han | han_muc | trung_dai_han | tieu_dung
   - Each loan case links to customer + loan_method

2. **Template filtering by loan_method**
   - When user selects loan_method → show only relevant DOCX templates
   - Template master tagged with `loan_method[]`

3. **Loan creation workflow UI**
   - Step 1: Select customer (or create new)
   - Step 2: Choose loan_method → auto-show relevant templates + forms
   - Step 3: Fill data (PA for SXKD methods, income for tiêu dùng)
   - Step 4: Export selected DOCX templates

4. **Income-based repayment form (tiêu dùng only)**
   - Employer info, salary, living expenses
   - Auto-calc repayment capacity
   - Mẫu 2268.09, 2268.12

### Success Criteria
- User selects loan method → sees correct template set
- Tiêu dùng shows income form instead of PA
- Each method exports correct DOCX set
