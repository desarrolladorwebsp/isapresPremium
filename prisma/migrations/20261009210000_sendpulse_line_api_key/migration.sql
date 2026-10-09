ALTER TABLE "sendpulse_bot_lines" ADD COLUMN IF NOT EXISTS "api_key_enc" TEXT;
ALTER TABLE "sendpulse_bot_lines" ADD COLUMN IF NOT EXISTS "api_key_prefix" TEXT;
