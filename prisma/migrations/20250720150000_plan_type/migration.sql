-- Modalidad del plan Isapre: preferente | libre elección | cerrado
CREATE TYPE "PlanType" AS ENUM ('preferred', 'free_choice', 'closed');

ALTER TABLE "plans" ADD COLUMN "plan_type" "PlanType";

-- Backfill con la misma prioridad que resolvePrimaryPlanType (preferred > closed > free_choice)
UPDATE "plans"
SET "plan_type" = 'preferred'
WHERE "has_top" = true
   OR lower("plan_name") LIKE '%preferente%'
   OR lower(coalesce("additional_notes", '')) LIKE '%preferente%';

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

ALTER TABLE "plans" ALTER COLUMN "plan_type" SET NOT NULL;
ALTER TABLE "plans" ALTER COLUMN "plan_type" SET DEFAULT 'free_choice';

CREATE INDEX "plans_plan_type_idx" ON "plans"("plan_type");
