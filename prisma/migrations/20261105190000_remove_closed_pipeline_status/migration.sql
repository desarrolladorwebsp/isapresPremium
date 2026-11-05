-- Retire the ambiguous legacy pipeline state. Preserve those clients as
-- sent to the insurer and leave an explicit review note for the team.
BEGIN;

UPDATE "users"
SET
  "pipeline_status" = 'ENVIADO_ISAPRE',
  "pipeline_notes" = concat_ws(
    E'\n',
    NULLIF("pipeline_notes", ''),
    format(
      '[%s · Sistema] Estado antiguo «Cerrado» migrado a «Enviado a Isapre». Confirmar con el cliente si fue recepcionado por la Isapre o si sigue pendiente de cierre.',
      to_char(now() AT TIME ZONE 'America/Santiago', 'DD-MM-YY HH12:MI a.m.')
    )
  ),
  "updated_at" = now()
WHERE "pipeline_status"::text = 'CERRADO';

-- Production may already lack the legacy enum value: avoid rewriting that table.
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ClientPipelineStatus'
      AND n.nspname = current_schema()
      AND e.enumlabel = 'CERRADO'
  ) THEN
    ALTER TABLE "users" ALTER COLUMN "pipeline_status" DROP DEFAULT;

    CREATE TYPE "ClientPipelineStatus_new" AS ENUM (
      'PAUSADO',
      'PENDIENTE',
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
      USING "pipeline_status"::text::"ClientPipelineStatus_new";

    DROP TYPE "ClientPipelineStatus";

    ALTER TYPE "ClientPipelineStatus_new" RENAME TO "ClientPipelineStatus";

    ALTER TABLE "users"
      ALTER COLUMN "pipeline_status" SET DEFAULT 'NUEVO'::"ClientPipelineStatus";
  END IF;
END
$migration$;

COMMIT;
