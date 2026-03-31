-- Add missing CIC fields for individual customer profile
ALTER TABLE "customers" ADD COLUMN "cic_product_name" TEXT;
ALTER TABLE "customers" ADD COLUMN "cic_product_code" TEXT;
