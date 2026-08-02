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
