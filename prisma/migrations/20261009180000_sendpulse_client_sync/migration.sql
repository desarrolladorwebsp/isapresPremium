-- Origen y datos del chatbot en la ficha del cliente.
ALTER TYPE "ClientOrigin" ADD VALUE IF NOT EXISTS 'SENDPULSE';

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sendpulse_contact_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sendpulse_bot_phone" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sendpulse_chat" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_sendpulse_contact_id_key" ON "users"("sendpulse_contact_id");
