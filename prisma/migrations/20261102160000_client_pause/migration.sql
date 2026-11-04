-- Additive: no reassignment, agenda changes or quotation writes.
ALTER TYPE "ClientPipelineStatus" ADD VALUE IF NOT EXISTS 'PAUSADO';
ALTER TYPE "ClientPipelineStatus" ADD VALUE IF NOT EXISTS 'PENDIENTE';
ALTER TABLE "users"
 ADD COLUMN IF NOT EXISTS "pause_until_month" TEXT,
 ADD COLUMN IF NOT EXISTS "pause_reason" TEXT,
 ADD COLUMN IF NOT EXISTS "paused_at" TIMESTAMP(3),
 ADD COLUMN IF NOT EXISTS "paused_by_id" TEXT,
 ADD COLUMN IF NOT EXISTS "pending_since" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "users_pipeline_status_pause_until_month_idx" ON "users"("pipeline_status", "pause_until_month");
