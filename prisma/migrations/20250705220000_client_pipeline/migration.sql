-- Pipeline comercial por cliente (estatus, checklist Isapre, registro de cierre).

CREATE TYPE "ClientPipelineStatus" AS ENUM (
  'NUEVO',
  'CONTACTADO',
  'EN_SEGUIMIENTO',
  'PROPUESTA_ENVIADA',
  'DOCUMENTACION',
  'ENVIADO_ISAPRE',
  'CERRADO',
  'PERDIDO'
);

ALTER TABLE "users"
  ADD COLUMN "pipeline_status" "ClientPipelineStatus" NOT NULL DEFAULT 'NUEVO',
  ADD COLUMN "pipeline_checklist" JSONB,
  ADD COLUMN "pipeline_closed_record" JSONB,
  ADD COLUMN "pipeline_notes" TEXT;

CREATE INDEX "users_pipeline_status_idx" ON "users" ("pipeline_status");
