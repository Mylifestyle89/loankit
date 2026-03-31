-- Add selectedCollateralIds to loans table (JSON array of collateral IDs)
ALTER TABLE "loans" ADD COLUMN "selectedCollateralIds" TEXT NOT NULL DEFAULT '[]';
