-- CreateEnum
CREATE TYPE "ExecutiveKind" AS ENUM ('ISAPRES_PREMIUM', 'ZOOM', 'ISAPRES');

-- AlterTable: staff_accounts
ALTER TABLE "staff_accounts" ADD COLUMN "executive_kind" "ExecutiveKind";

-- AlterTable: staff_invites
ALTER TABLE "staff_invites" ADD COLUMN "executive_kind" "ExecutiveKind";

-- Backfill: todos los ejecutivos existentes → Isapres Premium
UPDATE "staff_accounts"
SET "executive_kind" = 'ISAPRES_PREMIUM'
WHERE "role" = 'EXECUTIVE' AND "executive_kind" IS NULL;

-- Invites pendientes de ejecutivo sin kind → Premium (default al activar)
UPDATE "staff_invites"
SET "executive_kind" = 'ISAPRES_PREMIUM'
WHERE "realm" = 'executive' AND "executive_kind" IS NULL AND "accepted_at" IS NULL;

-- CreateIndex
CREATE INDEX "staff_accounts_executive_kind_idx" ON "staff_accounts"("executive_kind");
