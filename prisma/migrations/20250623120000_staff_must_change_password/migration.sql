-- AlterTable
ALTER TABLE "admin_accounts" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "executive_accounts" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;
