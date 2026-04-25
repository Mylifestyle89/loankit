-- Add globalCustomerAccess flag to user table
ALTER TABLE "user" ADD COLUMN "globalCustomerAccess" BOOLEAN NOT NULL DEFAULT false;
