-- Unificar admin_accounts y executive_accounts en staff_accounts

CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'EXECUTIVE');

CREATE TABLE "staff_accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "phone" TEXT,
    "rut" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "assignments_suspended" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "subscription_status" "SubscriptionStatus",
    "subscription_plan_id" TEXT,
    "subscription_expires_at" TIMESTAMP(3),
    "stripe_customer_id" TEXT,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "password_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_accounts_pkey" PRIMARY KEY ("id")
);

INSERT INTO "staff_accounts" (
    "id",
    "email",
    "password_hash",
    "full_name",
    "role",
    "phone",
    "rut",
    "active",
    "assignments_suspended",
    "onboarding_completed",
    "subscription_status",
    "subscription_plan_id",
    "subscription_expires_at",
    "stripe_customer_id",
    "failed_login_attempts",
    "locked_until",
    "last_login_at",
    "password_changed_at",
    "must_change_password",
    "created_at",
    "updated_at"
)
SELECT
    "id",
    "email",
    "password_hash",
    "full_name",
    'ADMIN'::"StaffRole",
    NULL,
    "rut",
    "active",
    false,
    true,
    NULL,
    NULL,
    NULL,
    NULL,
    "failed_login_attempts",
    "locked_until",
    "last_login_at",
    "password_changed_at",
    "must_change_password",
    "created_at",
    "updated_at"
FROM "admin_accounts";

INSERT INTO "staff_accounts" (
    "id",
    "email",
    "password_hash",
    "full_name",
    "role",
    "phone",
    "rut",
    "active",
    "assignments_suspended",
    "onboarding_completed",
    "subscription_status",
    "subscription_plan_id",
    "subscription_expires_at",
    "stripe_customer_id",
    "failed_login_attempts",
    "locked_until",
    "last_login_at",
    "password_changed_at",
    "must_change_password",
    "created_at",
    "updated_at"
)
SELECT
    e."id",
    e."email",
    e."password_hash",
    e."full_name",
    'EXECUTIVE'::"StaffRole",
    e."phone",
    e."rut",
    e."active",
    e."assignments_suspended",
    e."onboarding_completed",
    e."subscription_status",
    e."subscription_plan_id",
    e."subscription_expires_at",
    e."stripe_customer_id",
    e."failed_login_attempts",
    e."locked_until",
    e."last_login_at",
    e."password_changed_at",
    e."must_change_password",
    e."created_at",
    e."updated_at"
FROM "executive_accounts" e
WHERE NOT EXISTS (
    SELECT 1
    FROM "staff_accounts" s
    WHERE LOWER(s."email") = LOWER(e."email")
);

UPDATE "quotes"
SET "executive_account_id" = NULL
WHERE "executive_account_id" IS NOT NULL
  AND "executive_account_id" NOT IN (SELECT "id" FROM "staff_accounts");

UPDATE "users"
SET "assigned_executive_id" = NULL
WHERE "assigned_executive_id" IS NOT NULL
  AND "assigned_executive_id" NOT IN (SELECT "id" FROM "staff_accounts");

ALTER TABLE "quotes" DROP CONSTRAINT "quotes_executive_account_id_fkey";
ALTER TABLE "users" DROP CONSTRAINT "users_assigned_executive_id_fkey";

DROP TABLE "admin_accounts";
DROP TABLE "executive_accounts";

ALTER TABLE "quotes"
ADD CONSTRAINT "quotes_executive_account_id_fkey"
FOREIGN KEY ("executive_account_id") REFERENCES "staff_accounts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "users"
ADD CONSTRAINT "users_assigned_executive_id_fkey"
FOREIGN KEY ("assigned_executive_id") REFERENCES "staff_accounts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "staff_accounts_email_key" ON "staff_accounts"("email");
CREATE UNIQUE INDEX "staff_accounts_stripe_customer_id_key" ON "staff_accounts"("stripe_customer_id");
CREATE INDEX "staff_accounts_role_idx" ON "staff_accounts"("role");
CREATE INDEX "staff_accounts_subscription_status_idx" ON "staff_accounts"("subscription_status");
