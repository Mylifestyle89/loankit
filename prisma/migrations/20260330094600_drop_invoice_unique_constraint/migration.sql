-- Drop unique constraint on invoices (invoiceNumber, supplierName)
-- Bảng kê mua hàng có nhiều dòng cùng mặt hàng, không cần invoiceNumber riêng
DROP INDEX IF EXISTS "invoices_invoiceNumber_supplierName_key";

-- Replace with normal index for query performance
CREATE INDEX IF NOT EXISTS "invoices_invoiceNumber_supplierName_idx" ON "invoices"("invoiceNumber", "supplierName");
