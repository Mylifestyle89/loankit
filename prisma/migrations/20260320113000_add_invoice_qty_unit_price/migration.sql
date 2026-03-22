-- Add missing invoice line-item columns referenced by Prisma schema.
ALTER TABLE "invoices" ADD COLUMN "qty" REAL;
ALTER TABLE "invoices" ADD COLUMN "unitPrice" REAL;
