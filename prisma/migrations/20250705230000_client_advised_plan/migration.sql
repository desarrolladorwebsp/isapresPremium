-- CreateEnum
CREATE TYPE "ClientActivityType" AS ENUM ('PLAN_CHANGED', 'ADVISED_PLAN_CLEARED');

-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "advised_plan_code" TEXT;

-- CreateTable
CREATE TABLE "client_activities" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "activity_type" "ClientActivityType" NOT NULL,
  "previous_value" TEXT,
  "new_value" TEXT,
  "actor_realm" TEXT,
  "actor_id" TEXT,
  "actor_name" TEXT,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "client_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_advised_plan_code_idx" ON "users" ("advised_plan_code");

-- CreateIndex
CREATE INDEX "client_activities_user_id_idx" ON "client_activities" ("user_id");

-- CreateIndex
CREATE INDEX "client_activities_created_at_idx" ON "client_activities" ("created_at");

-- AddForeignKey
ALTER TABLE "users"
  ADD CONSTRAINT "users_advised_plan_code_fkey"
  FOREIGN KEY ("advised_plan_code") REFERENCES "plans"("unique_code")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_activities"
  ADD CONSTRAINT "client_activities_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
