# Brainstorm: Loan Product Integration Scope

**Date:** 2026-04-04 | **Status:** BLOCKED — chờ đủ templates tiêu dùng

## Problem
CBTD hay in nhầm mẫu biểu vì màn hình in hiện TẤT CẢ mẫu theo loan_method. Cùng loan_method (VD: tieu_dung) có nhiều sản phẩm khác nhau (TD thường, TD không TSBĐ, TD thấu chi, cầm cố) nhưng cùng pool mẫu biểu.

## Final Decision
**Sản phẩm tín dụng = BỘ LỌC mẫu biểu khi in ấn** (không phải metadata khoản vay).

Chỉ implement:
- Dropdown sản phẩm trên `KhcnDocChecklist` (màn hình in)
- Mapping config: product_code → [template paths]
- Backward compat: không chọn product → hiện tất cả (như cũ)

Không implement:
- ❌ Product dropdown trên form phương án
- ❌ Auto-populate fields theo product
- ❌ Wizard workflow
- ❌ Ẩn fields trên form theo product

## Blocker
- Chưa đủ mẫu biểu cho sản phẩm tiêu dùng (KHCN-TD, KHCN-TD-KBD, KHCN-TD-TC, KHCN-CC)
- File mapping XLSX đã tạo: `plans/product-template-mapping.xlsx`
- Khi đủ templates → user điền mapping → implement product filter

## Implementation Plan (khi sẵn sàng)
1. Đọc mapping từ XLSX đã điền
2. Thêm field `products: string[]` vào `KhcnDocTemplate` type
3. Thêm mapping vào `khcn-template-registry.ts`
4. Thêm dropdown sản phẩm vào `KhcnDocChecklist`
5. Filter: chọn product → chỉ hiện templates có product code đó (hoặc products = [])

## Đã Hoàn Thành (session này)
- ✅ Loan Product Master (DB + API + Admin UI + 9 sản phẩm seed)
- ✅ Config-Driven Field Visibility (types + config + hook + refactor 2 forms)
- ✅ Brainstorm kết luận scope hợp lý

## Files Đã Tạo/Sửa
### Mới
- prisma/schema.prisma (LoanProduct model)
- src/app/api/loan-products/route.ts
- src/app/api/loan-products/[productId]/route.ts
- src/app/report/system-operations/loan-products-tab.tsx
- prisma/seed-loan-products.ts
- src/lib/field-visibility/field-visibility-types.ts
- src/lib/field-visibility/field-visibility-config.ts
- src/lib/field-visibility/use-field-visibility.ts
- plans/product-template-mapping.xlsx

### Sửa
- src/app/report/system-operations/page.tsx (thêm tab)
- src/app/report/customers/[id]/components/customer-info-form.tsx (dùng hook)
- src/components/customers/customer-new-form.tsx (dùng hook)
