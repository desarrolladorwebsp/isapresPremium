-- Carteras BOT sin inicio de sesión. No crea cuentas ni importa clientes.
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'BOT';
CREATE TABLE IF NOT EXISTS "sendpulse_client_imports" (
  "user_id" TEXT PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "source_bot_account_id" TEXT NOT NULL REFERENCES "staff_accounts"("id") ON DELETE RESTRICT,
  "source_contact_ids" TEXT[] NOT NULL,
  "source_batch" TEXT NOT NULL,
  "raw_data" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "sendpulse_client_imports_source_bot_account_id_idx" ON "sendpulse_client_imports"("source_bot_account_id");
CREATE INDEX IF NOT EXISTS "sendpulse_client_imports_source_batch_idx" ON "sendpulse_client_imports"("source_batch");
