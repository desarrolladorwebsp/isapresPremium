-- Webhook SendPulse: una línea (número de bot) por token, y el registro de cada llamada.

CREATE TYPE "SendpulseWebhookOutcome" AS ENUM (
  'OK',
  'DUPLICATE',
  'INVALID_TOKEN',
  'INVALID_PAYLOAD',
  'EMAIL_FAILED',
  'RATE_LIMITED',
  'UNAVAILABLE'
);

CREATE TABLE "sendpulse_bot_lines" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "bot_phone" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_prefix" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sendpulse_bot_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sendpulse_webhook_events" (
    "id" TEXT NOT NULL,
    "line_id" TEXT,
    "bot_phone" TEXT,
    "contact_id" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "trigger_key" TEXT,
    "outcome" "SendpulseWebhookOutcome" NOT NULL,
    "http_status" INTEGER NOT NULL,
    "error_message" TEXT,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sendpulse_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sendpulse_bot_lines_bot_phone_key" ON "sendpulse_bot_lines"("bot_phone");

CREATE UNIQUE INDEX "sendpulse_bot_lines_token_hash_key" ON "sendpulse_bot_lines"("token_hash");

CREATE INDEX "sendpulse_webhook_events_created_at_idx" ON "sendpulse_webhook_events"("created_at");

CREATE INDEX "sendpulse_webhook_events_line_id_idx" ON "sendpulse_webhook_events"("line_id");

CREATE INDEX "sendpulse_webhook_events_contact_id_trigger_key_created_at_idx" ON "sendpulse_webhook_events"("contact_id", "trigger_key", "created_at");

ALTER TABLE "sendpulse_webhook_events" ADD CONSTRAINT "sendpulse_webhook_events_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "sendpulse_bot_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
