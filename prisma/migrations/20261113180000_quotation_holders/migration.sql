ALTER TYPE "ClientQuotationStatus" ADD VALUE IF NOT EXISTS 'NOT_SELECTED';
ALTER TABLE "client_quotations" ADD COLUMN IF NOT EXISTS "holder_selections" JSONB;
