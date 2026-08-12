-- AlterEnum
ALTER TYPE "ClientActivityType" ADD VALUE 'PLAN_ASSIGNED';
ALTER TYPE "ClientActivityType" ADD VALUE 'PLAN_UNASSIGNED';

-- CreateTable
CREATE TABLE "client_assigned_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_code" TEXT NOT NULL,
    "notes" TEXT,
    "assigned_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_assigned_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_assigned_plans_user_id_idx" ON "client_assigned_plans"("user_id");

-- CreateIndex
CREATE INDEX "client_assigned_plans_plan_code_idx" ON "client_assigned_plans"("plan_code");

-- CreateIndex
CREATE UNIQUE INDEX "client_assigned_plans_user_id_plan_code_key" ON "client_assigned_plans"("user_id", "plan_code");

-- AddForeignKey
ALTER TABLE "client_assigned_plans" ADD CONSTRAINT "client_assigned_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_assigned_plans" ADD CONSTRAINT "client_assigned_plans_plan_code_fkey" FOREIGN KEY ("plan_code") REFERENCES "plans"("unique_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: existing advised plan becomes an assigned plan
INSERT INTO "client_assigned_plans" ("id", "user_id", "plan_code", "created_at")
SELECT md5(random()::text || clock_timestamp()::text || u."id"), u."id", u."advised_plan_code", CURRENT_TIMESTAMP
FROM "users" u
WHERE u."advised_plan_code" IS NOT NULL
ON CONFLICT ("user_id", "plan_code") DO NOTHING;
