-- CreateEnum
CREATE TYPE "CalendlyTeam" AS ENUM ('EQUIPO_1', 'EQUIPO_2', 'EQUIPO_3');

-- CreateEnum
CREATE TYPE "CalendlyBookingStatus" AS ENUM ('SCHEDULED', 'CANCELED', 'NO_SHOW');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "calendly_team" "CalendlyTeam";
ALTER TABLE "users" ADD COLUMN "zoom_join_url" TEXT;

-- CreateTable
CREATE TABLE "app_meta" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_meta_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "calendly_bookings" (
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

-- CreateIndex
CREATE UNIQUE INDEX "calendly_bookings_event_uuid_key" ON "calendly_bookings"("event_uuid");

-- CreateIndex
CREATE INDEX "calendly_bookings_user_id_idx" ON "calendly_bookings"("user_id");

-- CreateIndex
CREATE INDEX "calendly_bookings_invitee_uuid_idx" ON "calendly_bookings"("invitee_uuid");

-- CreateIndex
CREATE INDEX "calendly_bookings_start_at_idx" ON "calendly_bookings"("start_at");

-- CreateIndex
CREATE INDEX "calendly_bookings_calendly_team_idx" ON "calendly_bookings"("calendly_team");

-- CreateIndex
CREATE INDEX "calendly_bookings_status_idx" ON "calendly_bookings"("status");

-- AddForeignKey
ALTER TABLE "calendly_bookings" ADD CONSTRAINT "calendly_bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
