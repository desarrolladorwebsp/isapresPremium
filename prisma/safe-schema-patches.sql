-- Parches aditivos idempotentes para entornos con historial de migraciones inconsistente.
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "company_agreement_rut" TEXT;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "company_agreement_name" TEXT;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "company_agreement_discount" DOUBLE PRECISION;

ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "location_source" TEXT;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "location_updated_at" TIMESTAMP(3);

-- Modalidad comercial del plan (preferente / libre elección / cerrado)
DO $$ BEGIN
  CREATE TYPE "PlanType" AS ENUM ('preferred', 'free_choice', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "plan_type" "PlanType";

UPDATE "plans"
SET "plan_type" = 'preferred'
WHERE "plan_type" IS NULL
  AND (
    "has_top" = true
    OR lower("plan_name") LIKE '%preferente%'
    OR lower(coalesce("additional_notes", '')) LIKE '%preferente%'
  );

UPDATE "plans"
SET "plan_type" = 'closed'
WHERE "plan_type" IS NULL
  AND (
    lower("plan_name") LIKE '%cerrado%'
    OR lower("plan_name") LIKE '%-sf%'
    OR lower(coalesce("additional_notes", '')) LIKE '%cerrado%'
  );

UPDATE "plans"
SET "plan_type" = 'free_choice'
WHERE "plan_type" IS NULL;

ALTER TABLE "plans" ALTER COLUMN "plan_type" SET DEFAULT 'free_choice';

DO $$ BEGIN
  ALTER TABLE "plans" ALTER COLUMN "plan_type" SET NOT NULL;
EXCEPTION
  WHEN others THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "plans_plan_type_idx" ON "plans"("plan_type");

-- Recuperación de contraseña staff (migración 20250716120000)
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "staff_account_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_key"
  ON "password_reset_tokens"("token_hash");

CREATE INDEX IF NOT EXISTS "password_reset_tokens_staff_account_id_idx"
  ON "password_reset_tokens"("staff_account_id");

CREATE INDEX IF NOT EXISTS "password_reset_tokens_expires_at_idx"
  ON "password_reset_tokens"("expires_at");

DO $$ BEGIN
  ALTER TABLE "password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_staff_account_id_fkey"
    FOREIGN KEY ("staff_account_id") REFERENCES "staff_accounts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Calendly multi-equipo (migración 20260727180000)
DO $$ BEGIN
  CREATE TYPE "CalendlyTeam" AS ENUM ('EQUIPO_1', 'EQUIPO_2', 'EQUIPO_3');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CalendlyBookingStatus" AS ENUM ('SCHEDULED', 'CANCELED', 'NO_SHOW');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "calendly_team" "CalendlyTeam";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "zoom_join_url" TEXT;

CREATE TABLE IF NOT EXISTS "app_meta" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "app_meta_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "calendly_bookings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "calendly_team" "CalendlyTeam" NOT NULL,
    "event_uuid" TEXT NOT NULL,
    "invitee_uuid" TEXT NOT NULL,
    "invitee_email" TEXT,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3),
    "status" "CalendlyBookingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "zoom_join_url" TEXT,
    "zoom_meeting_id" TEXT,
    "cancel_url" TEXT,
    "reschedule_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "calendly_bookings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "calendly_bookings_event_uuid_key"
  ON "calendly_bookings"("event_uuid");

CREATE INDEX IF NOT EXISTS "calendly_bookings_user_id_idx"
  ON "calendly_bookings"("user_id");

CREATE INDEX IF NOT EXISTS "calendly_bookings_invitee_uuid_idx"
  ON "calendly_bookings"("invitee_uuid");

CREATE INDEX IF NOT EXISTS "calendly_bookings_start_at_idx"
  ON "calendly_bookings"("start_at");

CREATE INDEX IF NOT EXISTS "calendly_bookings_calendly_team_idx"
  ON "calendly_bookings"("calendly_team");

CREATE INDEX IF NOT EXISTS "calendly_bookings_status_idx"
  ON "calendly_bookings"("status");

DO $$ BEGIN
  ALTER TABLE "calendly_bookings"
    ADD CONSTRAINT "calendly_bookings_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Origen de leads desde formularios web (API pública /api/public/v1/clients)
DO $$ BEGIN
  ALTER TYPE "ClientOrigin" ADD VALUE IF NOT EXISTS 'FORMULARIO_WEB';
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "ClientOrigin" ADD VALUE IF NOT EXISTS 'CAMPANA_EXPERTO_EN_SALUD';
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_object THEN null;
END $$;

-- Quién registró el cliente (alta manual)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "registered_by_id" TEXT;

CREATE INDEX IF NOT EXISTS "users_registered_by_id_idx" ON "users"("registered_by_id");

DO $$ BEGIN
  ALTER TABLE "users"
    ADD CONSTRAINT "users_registered_by_id_fkey"
    FOREIGN KEY ("registered_by_id") REFERENCES "staff_accounts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Documentos de ficha de cliente
DO $$ BEGIN
  CREATE TYPE "ClientDocumentKind" AS ENUM ('RUT', 'LIQUIDACION', 'PLAN', 'OTROS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "client_documents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" "ClientDocumentKind" NOT NULL,
    "custom_label" TEXT,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "storage_backend" TEXT NOT NULL DEFAULT 'blob',
    "uploaded_by_id" TEXT,
    "uploaded_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "client_documents_user_id_idx" ON "client_documents"("user_id");
CREATE INDEX IF NOT EXISTS "client_documents_kind_idx" ON "client_documents"("kind");
CREATE INDEX IF NOT EXISTS "client_documents_created_at_idx" ON "client_documents"("created_at");

DO $$ BEGIN
  ALTER TABLE "client_documents"
    ADD CONSTRAINT "client_documents_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "client_documents"
    ADD CONSTRAINT "client_documents_uploaded_by_id_fkey"
    FOREIGN KEY ("uploaded_by_id") REFERENCES "staff_accounts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Foto de perfil staff
ALTER TABLE "staff_accounts" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;
ALTER TABLE "staff_accounts" ADD COLUMN IF NOT EXISTS "avatar_storage_key" TEXT;

-- Cotización comercial.
-- Producción llegó a tener un esquema anterior vacío (user_id, client_quotation_plans)
-- que no coincide con el modelo de la app. Solo se reemplaza si no hay filas.
DO $$
DECLARE
  old_shape boolean;
  row_count bigint;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'client_quotations'
      AND column_name = 'user_id'
  ) INTO old_shape;

  IF old_shape THEN
    EXECUTE 'SELECT count(*) FROM client_quotations' INTO row_count;
    IF row_count > 0 THEN
      RAISE EXCEPTION 'client_quotations tiene datos; no se reemplaza el esquema anterior';
    END IF;
    DROP TABLE IF EXISTS client_quotation_events CASCADE;
    DROP TABLE IF EXISTS client_quotation_plans CASCADE;
    DROP TABLE IF EXISTS client_quotations CASCADE;
    DROP TYPE IF EXISTS "ClientQuotationEventType";
    DROP TYPE IF EXISTS "ClientQuotationStatus";
    DROP TYPE IF EXISTS "ClientQuotationActivityType";
  END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE "ClientQuotationStatus" AS ENUM ('DRAFT', 'SENT', 'RECEIVED', 'ACCEPTED', 'REJECTED', 'VOIDED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ClientQuotationActivityType" AS ENUM ('CREATED', 'PDF_DOWNLOADED', 'EMAIL_SENT', 'EMAIL_FAILED', 'WHATSAPP_OPENED', 'STATUS_CHANGED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TYPE "ClientActivityType" ADD VALUE IF NOT EXISTS 'QUOTATION_CREATED';
ALTER TYPE "ClientActivityType" ADD VALUE IF NOT EXISTS 'QUOTATION_SENT';
ALTER TYPE "ClientActivityType" ADD VALUE IF NOT EXISTS 'QUOTATION_STATUS_CHANGED';

CREATE TABLE IF NOT EXISTS "client_quotations" (
  "id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "client_id" TEXT NOT NULL,
  "executive_id" TEXT NOT NULL,
  "status" "ClientQuotationStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "client_snapshot" JSONB NOT NULL,
  "executive_snapshot" JSONB NOT NULL,
  "valid_until" TIMESTAMP(3),
  "issued_at" TIMESTAMP(3),
  "sent_at" TIMESTAMP(3),
  "received_at" TIMESTAMP(3),
  "accepted_at" TIMESTAMP(3),
  "rejected_at" TIMESTAMP(3),
  "voided_at" TIMESTAMP(3),
  "outcome_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "client_quotations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "client_quotation_items" (
  "id" TEXT NOT NULL,
  "quotation_id" TEXT NOT NULL,
  "plan_code" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "plan_snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_quotation_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "client_quotation_activities" (
  "id" TEXT NOT NULL,
  "quotation_id" TEXT NOT NULL,
  "activity_type" "ClientQuotationActivityType" NOT NULL,
  "actor_id" TEXT,
  "actor_name" TEXT,
  "channel" TEXT,
  "previous_value" TEXT,
  "new_value" TEXT,
  "description" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_quotation_activities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "client_quotations_number_key" ON "client_quotations"("number");
CREATE INDEX IF NOT EXISTS "client_quotations_client_id_created_at_idx" ON "client_quotations"("client_id", "created_at");
CREATE INDEX IF NOT EXISTS "client_quotations_executive_id_created_at_idx" ON "client_quotations"("executive_id", "created_at");
CREATE INDEX IF NOT EXISTS "client_quotations_executive_id_status_created_at_idx" ON "client_quotations"("executive_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "client_quotations_status_created_at_idx" ON "client_quotations"("status", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "client_quotation_items_quotation_id_plan_code_key" ON "client_quotation_items"("quotation_id", "plan_code");
CREATE UNIQUE INDEX IF NOT EXISTS "client_quotation_items_quotation_id_position_key" ON "client_quotation_items"("quotation_id", "position");
CREATE INDEX IF NOT EXISTS "client_quotation_items_plan_code_idx" ON "client_quotation_items"("plan_code");
CREATE INDEX IF NOT EXISTS "client_quotation_activities_quotation_id_created_at_idx" ON "client_quotation_activities"("quotation_id", "created_at");
CREATE INDEX IF NOT EXISTS "client_quotation_activities_actor_id_activity_type_created_at_idx" ON "client_quotation_activities"("actor_id", "activity_type", "created_at");
CREATE INDEX IF NOT EXISTS "client_quotation_activities_activity_type_created_at_idx" ON "client_quotation_activities"("activity_type", "created_at");

DO $$ BEGIN
  ALTER TABLE "client_quotations"
    ADD CONSTRAINT "client_quotations_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "client_quotations"
    ADD CONSTRAINT "client_quotations_executive_id_fkey"
    FOREIGN KEY ("executive_id") REFERENCES "staff_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "client_quotation_items"
    ADD CONSTRAINT "client_quotation_items_quotation_id_fkey"
    FOREIGN KEY ("quotation_id") REFERENCES "client_quotations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "client_quotation_activities"
    ADD CONSTRAINT "client_quotation_activities_quotation_id_fkey"
    FOREIGN KEY ("quotation_id") REFERENCES "client_quotations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Webhook SendPulse (migración 20261009120000)
DO $$ BEGIN
  CREATE TYPE "SendpulseWebhookOutcome" AS ENUM (
    'OK',
    'DUPLICATE',
    'INVALID_TOKEN',
    'INVALID_PAYLOAD',
    'EMAIL_FAILED',
    'RATE_LIMITED',
    'UNAVAILABLE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "sendpulse_bot_lines" (
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

CREATE TABLE IF NOT EXISTS "sendpulse_webhook_events" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "sendpulse_bot_lines_bot_phone_key" ON "sendpulse_bot_lines"("bot_phone");
CREATE UNIQUE INDEX IF NOT EXISTS "sendpulse_bot_lines_token_hash_key" ON "sendpulse_bot_lines"("token_hash");
CREATE INDEX IF NOT EXISTS "sendpulse_webhook_events_created_at_idx" ON "sendpulse_webhook_events"("created_at");
CREATE INDEX IF NOT EXISTS "sendpulse_webhook_events_line_id_idx" ON "sendpulse_webhook_events"("line_id");
CREATE INDEX IF NOT EXISTS "sendpulse_webhook_events_contact_id_trigger_key_created_at_idx" ON "sendpulse_webhook_events"("contact_id", "trigger_key", "created_at");

DO $$ BEGIN
  ALTER TABLE "sendpulse_webhook_events"
    ADD CONSTRAINT "sendpulse_webhook_events_line_id_fkey"
    FOREIGN KEY ("line_id") REFERENCES "sendpulse_bot_lines"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
