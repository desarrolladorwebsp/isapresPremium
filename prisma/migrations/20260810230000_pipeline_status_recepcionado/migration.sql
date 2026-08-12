-- Pipeline statuses:
-- - Drop PROPUESTA_ENVIADA / DOCUMENTACION (migrate → EN_SEGUIMIENTO)
-- - Rename CERRADO → RECEPCIONADO

ALTER TABLE "users" ALTER COLUMN "pipeline_status" DROP DEFAULT;

CREATE TYPE "ClientPipelineStatus_new" AS ENUM (
  'NUEVO',
  'CONTACTADO',
  'NO_CONTESTA',
  'EN_SEGUIMIENTO',
  'ENVIADO_ISAPRE',
  'RECEPCIONADO',
  'PERDIDO'
);

ALTER TABLE "users"
  ALTER COLUMN "pipeline_status" TYPE "ClientPipelineStatus_new"
  USING (
    CASE "pipeline_status"::text
      WHEN 'PROPUESTA_ENVIADA' THEN 'EN_SEGUIMIENTO'
      WHEN 'DOCUMENTACION' THEN 'EN_SEGUIMIENTO'
      WHEN 'CERRADO' THEN 'RECEPCIONADO'
      ELSE "pipeline_status"::text
    END
  )::"ClientPipelineStatus_new";

ALTER TABLE "users"
  ALTER COLUMN "pipeline_status" SET DEFAULT 'NUEVO'::"ClientPipelineStatus_new";

DROP TYPE "ClientPipelineStatus";

ALTER TYPE "ClientPipelineStatus_new" RENAME TO "ClientPipelineStatus";
